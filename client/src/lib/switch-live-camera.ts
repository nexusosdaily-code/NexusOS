export type CameraFacing = "user" | "environment";

interface CameraSwitchOptions {
  camera: MediaStream;
  combined: MediaStream;
  peers: Map<string, RTCPeerConnection>;
  constraints: MediaTrackConstraints;
  facing: CameraFacing;
  isCurrent: () => boolean;
  publishCamera: (stream: MediaStream) => void;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}

/**
 * Keep the microphone and combined stream identity. Publishing a replacement
 * before awaiting senders ensures a newly joining viewer uses the new video.
 * No signaling/authentication/room state is changed by switching cameras.
 */
export async function switchLiveCamera(options: CameraSwitchOptions): Promise<CameraFacing> {
  const { camera, combined, peers, constraints, isCurrent, publishCamera } = options;
  const capture = options.getUserMedia ?? (input => navigator.mediaDevices.getUserMedia(input));
  const oldTrack = camera.getVideoTracks()[0];
  if (!oldTrack || oldTrack.readyState === "ended") throw new Error("Camera is unavailable. End the broadcast and start again.");
  const reportedFacing = oldTrack.getSettings().facingMode;
  const previous: CameraFacing = reportedFacing === "environment" || reportedFacing === "user" ? reportedFacing : options.facing;
  const target: CameraFacing = previous === "user" ? "environment" : "user";
  const audio = camera.getAudioTracks();
  const videoEnabled = oldTrack.enabled;
  let acquired: MediaStream | undefined;
  let released = false;
  let published = false;

  const acquire = async (facing: CameraFacing) => {
    const stream = await capture({ video: { ...constraints, facingMode: { exact: facing } }, audio: false });
    if (!isCurrent()) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error("Broadcast ended while switching cameras.");
    }
    const video = stream.getVideoTracks()[0];
    if (!video || video.readyState === "ended" ||
        (video.getSettings().facingMode && video.getSettings().facingMode !== facing) ||
        (facing === target && oldTrack.getSettings().deviceId &&
          video.getSettings().deviceId === oldTrack.getSettings().deviceId)) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error("The other camera is not available on this device.");
    }
    video.enabled = videoEnabled;
    return stream;
  };

  const publish = (track: MediaStreamTrack) => {
    combined.getVideoTracks().forEach(video => combined.removeTrack(video));
    combined.addTrack(track);
    publishCamera(new MediaStream([track, ...audio]));
  };

  const replaceSenders = async (track: MediaStreamTrack, rollback = false) => {
    const results = await Promise.allSettled([...peers.entries()].map(async ([id, pc]) => {
      const isClosed = () => pc.connectionState === "closed";
      if (isClosed()) return;
      const sender = pc.getSenders().find(sender => sender.track?.kind === "video");
      if (!sender) return; // A new peer may not have added its tracks yet.
      try { await sender.replaceTrack(track); }
      catch (error) {
        if (isClosed()) return;
        if (rollback) {
          // Never retain a peer sending a failed/stopped replacement track.
          pc.close();
          if (peers.get(id) === pc) peers.delete(id);
        }
        throw error;
      }
    }));
    if (!rollback && results.some(result => result.status === "rejected")) {
      throw new Error("One or more video connections could not switch cameras.");
    }
  };

  try {
    try { acquired = await acquire(target); }
    catch (error) {
      if (!isCurrent()) throw error;
      // Some mobile devices cannot hold front and rear cameras concurrently.
      // Only release the old VIDEO track for this specific hardware-busy case.
      if (!(error instanceof Error) || !["NotReadableError", "TrackStartError"].includes(error.name)) throw error;
      oldTrack.stop();
      released = true;
      acquired = await acquire(target);
    }
    const nextTrack = acquired.getVideoTracks()[0];
    if (!isCurrent()) throw new Error("Broadcast ended while switching cameras.");
    publish(nextTrack);
    published = true;
    await replaceSenders(nextTrack);
    if (!isCurrent()) throw new Error("Broadcast ended while switching cameras.");
    oldTrack.stop();
    return target;
  } catch (error) {
    if (!isCurrent()) {
      acquired?.getTracks().forEach(track => track.stop());
      oldTrack.stop();
      throw error;
    }
    if (published || released) {
      // Release failed acquisition before trying to reopen an exclusive camera.
      acquired?.getTracks().forEach(track => track.stop());
      try {
        const restored = released ? await acquire(previous) : camera;
        const restoredTrack = restored.getVideoTracks()[0];
        if (!isCurrent()) {
          if (released) restored.getTracks().forEach(track => track.stop());
          throw new Error("Broadcast ended while restoring the camera.");
        }
        publish(restoredTrack);
        await replaceSenders(restoredTrack, true);
      } catch {
        if (isCurrent()) {
          combined.getVideoTracks().forEach(track => {
            combined.removeTrack(track);
            track.stop();
          });
          publishCamera(new MediaStream(audio));
        }
        throw new Error("Camera switch failed and video could not be fully restored. End the broadcast and start again.");
      }
    }
    acquired?.getTracks().forEach(track => track.stop());
    throw new Error(error instanceof Error ? `${error.message} The previous camera was kept where available.` : "Could not switch cameras.");
  }
}
