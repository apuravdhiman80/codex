import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CameraConstraints, CameraSession, CameraStatus } from "./cameraService";
import { BrowserCameraService } from "./cameraService";

export function useCamera(constraints: CameraConstraints = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const service = useMemo(() => new BrowserCameraService(), []);
  const [status, setStatus] = useState<CameraStatus>(() => service.status());
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [session, setSession] = useState<CameraSession>();

  useEffect(() => {
    const unsubscribe = service.subscribeToCameraStatus(setStatus);
    void service.enumerateCameras().then(setCameras);
    return () => {
      unsubscribe();
      service.stopCamera();
    };
  }, [service]);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) throw new Error("Camera preview is not ready. Retry after the page finishes loading.");
    const next = await service.startCamera(video, constraints);
    setSession(next);
    void service.enumerateCameras().then(setCameras);
    return next;
  }, [constraints, service]);

  const stop = useCallback(() => {
    service.stopCamera(session);
    setSession(undefined);
  }, [service, session]);

  return { videoRef, status, cameras, session, start, stop };
}
