import { useEffect, useRef, useState, type FormEvent } from "react";
import { parsePersonQr, type QrValidationError, type ValidatedPersonPayload } from "./qrSchema";
import { startQrScanner } from "./qrService";

interface QrScannerProps {
  onValidPayload: (payload: ValidatedPersonPayload) => void;
  onError: (error: Error) => void;
  existingIds?: string[];
  selectedDeviceId?: string;
}

export function QrScanner({
  onValidPayload,
  onError,
  existingIds = [],
  selectedDeviceId,
}: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onValidRef = useRef(onValidPayload);
  const onErrorRef = useRef(onError);
  const existingIdsRef = useRef(existingIds);
  const lastPayloadRef = useRef("");
  const [active, setActive] = useState(false);
  const [manualPayload, setManualPayload] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validated, setValidated] = useState<ValidatedPersonPayload | null>(null);

  onValidRef.current = onValidPayload;
  onErrorRef.current = onError;
  existingIdsRef.current = existingIds;

  useEffect(() => {
    if (!active || !videoRef.current) return;
    let cancelled = false;
    let stopScanner: (() => void) | undefined;
    setErrorMessage("");
    void startQrScanner(
      videoRef.current,
      selectedDeviceId,
      (payload) => acceptPayload(payload),
      (error) => reportError(error),
    ).then((stop) => {
      if (cancelled) stop();
      else stopScanner = stop;
    }).catch((error: unknown) => {
      const normalized = error instanceof Error ? error : new Error("QR scanner could not start.");
      reportError(normalized);
      setActive(false);
    });
    return () => {
      cancelled = true;
      stopScanner?.();
    };
    // Callback implementations read the current values from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, selectedDeviceId]);

  function reportError(error: Error) {
    setErrorMessage(error.message || "QR data could not be processed.");
    onErrorRef.current(error);
  }

  function acceptPayload(payload: string) {
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;
    const result = parsePersonQr(payload, existingIdsRef.current);
    if (!result.ok) {
      reportError(result.error);
      return;
    }
    setErrorMessage("");
    setValidated(result.value);
    onValidRef.current(result.value);
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    acceptPayload(manualPayload);
  }

  return (
    <section className="panel qr-scanner-panel" aria-labelledby="qr-scanner-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PERSON REGISTRATION</p>
          <h2 id="qr-scanner-title">Scan a profile QR</h2>
        </div>
        <span className={`status-pill ${active ? "status-pill-live" : ""}`}>
          <span aria-hidden="true" className="status-dot" />
          {active ? "SCANNER ACTIVE" : "CAMERA OFF"}
        </span>
      </div>

      <div className="qr-preview">
        <video ref={videoRef} aria-label="QR scanning camera preview" muted playsInline />
        {!active && <div className="qr-preview-empty"><span>▦</span><p>Camera stays off until you start scanning.</p></div>}
        {active && <div className="qr-scan-frame" aria-hidden="true"><span /></div>}
      </div>
      <div className="qr-actions">
        <button className="button button-primary" type="button" onClick={() => setActive((current) => !current)}>
          {active ? "Stop QR scanner" : "Start QR scanner"}
        </button>
        <span className="muted-text">The code carries profile text only. Face samples are captured separately.</span>
      </div>

      {errorMessage && (
        <p role="alert" className="inline-alert inline-alert-error">{errorMessage}</p>
      )}
      {validated && (
        <div className="inline-alert inline-alert-success" role="status">
          QR data validated for <strong>{validated.name}</strong>. Review the profile preview before saving.
        </div>
      )}

      <details className="manual-qr-entry">
        <summary>Enter QR data manually</summary>
        <form onSubmit={submitManual}>
          <label htmlFor="manual-qr-payload">Paste person QR JSON</label>
          <textarea
            id="manual-qr-payload"
            value={manualPayload}
            onChange={(event) => setManualPayload(event.target.value)}
            rows={5}
            autoComplete="off"
            spellCheck={false}
            placeholder={'{"version":1,"person_id":"P001","name":"Example Person"}'}
          />
          <button className="button button-secondary" type="submit" disabled={!manualPayload.trim()}>
            Validate QR data
          </button>
        </form>
      </details>
    </section>
  );
}

export type { QrValidationError };
