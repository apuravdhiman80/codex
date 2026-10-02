export type CameraStatus =
  | { state: "idle"; message: string }
  | { state: "requesting"; message: string }
  | { state: "active"; message: string; deviceId: string | null }
  | { state: "denied"; message: string }
  | { state: "unavailable"; message: string }
  | { state: "disconnected"; message: string };

export interface CameraConstraints {
  deviceId?: string;
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

export interface CameraSession {
  readonly id: number;
  readonly stream: MediaStream;
  readonly video: HTMLVideoElement;
  readonly deviceId: string | null;
  active: boolean;
}

export interface CameraMediaDevices {
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  addEventListener?(type: "devicechange", listener: EventListener): void;
  removeEventListener?(type: "devicechange", listener: EventListener): void;
}

function readDeviceId(stream: MediaStream): string | null {
  return stream.getVideoTracks()[0]?.getSettings().deviceId || null;
}

function errorStatus(error: unknown): CameraStatus {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return { state: "denied", message: "Camera access was denied. Allow camera permission in your browser and try again." };
  }
  if (error instanceof DOMException && (error.name === "NotFoundError" || error.name === "OverconstrainedError")) {
    return { state: "unavailable", message: "The selected camera is unavailable. Choose another camera or reconnect it." };
  }
  return { state: "unavailable", message: "The camera could not be started. Check browser support and camera permissions." };
}

export class BrowserCameraService {
  private nextId = 1;
  private current?: CameraSession;
  private currentStatus: CameraStatus = { state: "idle", message: "Camera is off." };
  private readonly listeners = new Set<(status: CameraStatus) => void>();
  private readonly mediaDevices: CameraMediaDevices;
  private endedListener?: EventListener;
  private deviceChangeListener?: EventListener;

  constructor(mediaDevices?: CameraMediaDevices) {
    const browserDevices = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    this.mediaDevices = mediaDevices ?? browserDevices ?? {
      getUserMedia: async () => { throw new Error("Camera APIs are unavailable in this browser."); },
      enumerateDevices: async () => [],
    };
  }

  async enumerateCameras(): Promise<MediaDeviceInfo[]> {
    try {
      return (await this.mediaDevices.enumerateDevices()).filter((device) => device.kind === "videoinput");
    } catch {
      this.publish({ state: "unavailable", message: "Camera devices could not be listed. Check browser permissions." });
      return [];
    }
  }

  async startCamera(video: HTMLVideoElement, constraints: CameraConstraints = {}): Promise<CameraSession> {
    this.stopCamera();
    this.publish({ state: "requesting", message: "Requesting camera permission…" });
    const videoConstraints: MediaTrackConstraints = {
      ...(constraints.deviceId ? { deviceId: { exact: constraints.deviceId } } : {}),
      ...(!constraints.deviceId && constraints.facingMode ? { facingMode: { ideal: constraints.facingMode } } : {}),
      ...(constraints.width ? { width: { ideal: constraints.width } } : {}),
      ...(constraints.height ? { height: { ideal: constraints.height } } : {}),
    };
    let stream: MediaStream | undefined;
    try {
      stream = await this.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      const status = errorStatus(error);
      this.publish(status);
      throw Object.assign(new Error(status.message), { cause: error, cameraStatus: status });
    }
    if (!stream) throw new Error("Camera stream was not created.");
    const session: CameraSession = {
      id: this.nextId++,
      stream,
      video,
      deviceId: readDeviceId(stream) ?? constraints.deviceId ?? null,
      active: true,
    };
    this.current = session;
    const track = stream.getVideoTracks()[0];
    this.endedListener = () => this.stopCamera(session, true);
    track?.addEventListener("ended", this.endedListener, { once: true });
    this.deviceChangeListener = () => void this.handleDeviceChange(session);
    this.mediaDevices.addEventListener?.("devicechange", this.deviceChangeListener);
    this.publish({ state: "active", message: "Camera is active. Video is processed in this browser.", deviceId: session.deviceId });
    return session;
  }

  stopCamera(session?: CameraSession, disconnected = false): void {
    const target = session ?? this.current;
    if (!target || !target.active) return;
    target.active = false;
    target.stream.getTracks().forEach((track) => track.stop());
    if (this.endedListener) target.stream.getVideoTracks()[0]?.removeEventListener("ended", this.endedListener);
    if (this.deviceChangeListener) this.mediaDevices.removeEventListener?.("devicechange", this.deviceChangeListener);
    if (target.video.srcObject === target.stream) target.video.srcObject = null;
    if (this.current === target) this.current = undefined;
    this.endedListener = undefined;
    this.deviceChangeListener = undefined;
    this.publish(disconnected
      ? { state: "disconnected", message: "Camera disconnected. Reconnect it and start the camera again." }
      : { state: "idle", message: "Camera is off." });
  }

  subscribeToCameraStatus(listener: (status: CameraStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  status(): CameraStatus {
    return this.currentStatus;
  }

  private async handleDeviceChange(session: CameraSession): Promise<void> {
    if (!session.active || session !== this.current) return;
    const cameras = await this.enumerateCameras();
    if (session.deviceId && !cameras.some((device) => device.deviceId === session.deviceId)) {
      this.stopCamera(session, true);
    }
  }

  private publish(status: CameraStatus): void {
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export const cameraService = new BrowserCameraService();

export const enumerateCameras = (): Promise<MediaDeviceInfo[]> => cameraService.enumerateCameras();
export const startCamera = (video: HTMLVideoElement, constraints?: CameraConstraints): Promise<CameraSession> =>
  cameraService.startCamera(video, constraints);
export const stopCamera = (session?: CameraSession): void => cameraService.stopCamera(session);
export const subscribeToCameraStatus = (listener: (status: CameraStatus) => void): (() => void) =>
  cameraService.subscribeToCameraStatus(listener);
