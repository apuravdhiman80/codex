import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

export type QrDecodeCallback = (payload: string) => void;

export async function startQrScanner(
  video: HTMLVideoElement,
  deviceId: string | undefined,
  onPayload: QrDecodeCallback,
  onError: (error: Error) => void,
): Promise<() => void> {
  const reader = new BrowserQRCodeReader();
  let controls: IScannerControls | undefined;
  let stopped = false;
  let lastPayload = "";
  const reportedErrors = new Set<string>();
  try {
    controls = await reader.decodeFromVideoDevice(deviceId, video, (result, error) => {
      if (stopped) return;
      if (result) {
        const text = result.getText();
        if (text && text !== lastPayload) {
          lastPayload = text;
          onPayload(text);
        }
        return;
      }
      const errorName = error?.name ?? "UnknownScanError";
      if (error && errorName !== "NotFoundException" && !reportedErrors.has(errorName)) {
        reportedErrors.add(errorName);
        onError(error instanceof Error ? error : new Error("QR scanning encountered an error."));
      }
    });
  } catch (error) {
    BrowserCodeReader.releaseAllStreams();
    BrowserCodeReader.cleanVideoSource(video);
    throw error instanceof Error ? error : new Error("Camera could not start for QR scanning.");
  }
  return () => {
    if (stopped) return;
    stopped = true;
    controls?.stop();
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) track.stop();
    }
    BrowserCodeReader.cleanVideoSource(video);
  };
}
