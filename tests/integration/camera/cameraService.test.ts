import { describe, expect, it, vi } from "vitest";
import { BrowserCameraService, type CameraMediaDevices } from "../../../src/features/camera/cameraService";

function makeTrack(deviceId = "camera-1") {
  const listeners = new Map<string, Set<EventListener>>();
  return {
    track: {
      stop: vi.fn(),
      getSettings: () => ({ deviceId }),
      addEventListener: (type: string, listener: EventListener) => {
        const group = listeners.get(type) ?? new Set<EventListener>();
        group.add(listener);
        listeners.set(type, group);
      },
      removeEventListener: (type: string, listener: EventListener) => listeners.get(type)?.delete(listener),
    } as unknown as MediaStreamTrack,
    emitEnded: () => listeners.get("ended")?.forEach((listener) => listener(new Event("ended"))),
  };
}

function makeMedia(devices: MediaDeviceInfo[], track: MediaStreamTrack) {
  const deviceListeners = new Set<EventListener>();
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  return {
    stream,
    listeners: deviceListeners,
    media: {
      getUserMedia: vi.fn(async () => stream),
      enumerateDevices: vi.fn(async () => devices),
      addEventListener: (_type: string, listener: EventListener) => deviceListeners.add(listener),
      removeEventListener: (_type: string, listener: EventListener) => deviceListeners.delete(listener),
    } as unknown as CameraMediaDevices,
  };
}

describe("camera service", () => {
  it("releasesTracksOnStop", async () => {
    const { track } = makeTrack();
    const { media, stream } = makeMedia([], track);
    const service = new BrowserCameraService(media);
    const video = { srcObject: null, play: vi.fn(async () => undefined) } as unknown as HTMLVideoElement;
    const session = await service.startCamera(video, { facingMode: "environment", width: 640, height: 480 });

    expect(media.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
    });
    expect(video.srcObject).toBe(stream);
    service.stopCamera(session);
    service.stopCamera(session);

    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("stopsOnDeviceRemoval", async () => {
    const { track, emitEnded } = makeTrack();
    const videoDevice = { kind: "videoinput", deviceId: "camera-1", label: "Camera", groupId: "" } as MediaDeviceInfo;
    const { media, listeners } = makeMedia([videoDevice], track);
    const service = new BrowserCameraService(media);
    const video = { srcObject: null, play: vi.fn(async () => undefined) } as unknown as HTMLVideoElement;
    const statuses: string[] = [];
    service.subscribeToCameraStatus((status) => statuses.push(status.state));
    const session = await service.startCamera(video, { deviceId: "camera-1", width: 640, height: 480 });

    media.enumerateDevices = vi.fn(async () => []);
    listeners.forEach((listener) => listener(new Event("devicechange")));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(track.stop).toHaveBeenCalledOnce();
    emitEnded();

    expect(session.active).toBe(false);
    expect(video.srcObject).toBeNull();
    expect(statuses).toContain("disconnected");
  });
});
