import { useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { createPersonQr, type ValidatedPersonPayload } from "./qrSchema";

interface QrGeneratorProps {
  initialPayload?: Partial<ValidatedPersonPayload>;
}

export function QrGenerator({ initialPayload = {} }: QrGeneratorProps) {
  const [personId, setPersonId] = useState(initialPayload.personId ?? "");
  const [name, setName] = useState(initialPayload.name ?? "");
  const [role, setRole] = useState(initialPayload.role ?? "");
  const [department, setDepartment] = useState(initialPayload.department ?? "");
  const [email, setEmail] = useState(initialPayload.email ?? "");
  const [phone, setPhone] = useState(initialPayload.phone ?? "");
  const [organization, setOrganization] = useState(initialPayload.organization ?? "");
  const [metadataText, setMetadataText] = useState(
    initialPayload.metadata ? JSON.stringify(initialPayload.metadata, null, 2) : "{}",
  );
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const metadata = JSON.parse(metadataText) as unknown;
      if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
        throw new Error("Metadata must be a JSON object of text values.");
      }
      const payload: ValidatedPersonPayload = {
        version: 1,
        personId,
        name,
        ...(role.trim() ? { role } : {}),
        ...(department.trim() ? { department } : {}),
        ...(email.trim() ? { email } : {}),
        ...(phone.trim() ? { phone } : {}),
        ...(organization.trim() ? { organization } : {}),
        ...(Object.keys(metadata).length ? { metadata: metadata as Record<string, string> } : {}),
      };
      const encoded = createPersonQr(payload);
      const image = await QRCode.toDataURL(encoded, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 360,
        color: { dark: "#e9f1ff", light: "#0b1220" },
      });
      setQrImage(image);
    } catch (reason) {
      setQrImage("");
      setError(reason instanceof Error ? reason.message : "QR code could not be generated.");
    }
  }

  return (
    <section className="panel qr-generator-panel" aria-labelledby="qr-generator-title">
      <div className="panel-heading">
        <div><p className="eyebrow">SHARE PROFILE DETAILS</p><h2 id="qr-generator-title">Generate person QR</h2></div>
      </div>
      <form className="form-grid" onSubmit={generate}>
        <label>Person ID<input value={personId} onChange={(event) => setPersonId(event.target.value)} required maxLength={64} /></label>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>
        <label>Role<input value={role} onChange={(event) => setRole(event.target.value)} maxLength={120} /></label>
        <label>Department<input value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={120} /></label>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={254} /></label>
        <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" maxLength={40} /></label>
        <label>Organization<input value={organization} onChange={(event) => setOrganization(event.target.value)} maxLength={160} /></label>
        <label className="field-span-2">Metadata JSON
          <textarea value={metadataText} onChange={(event) => setMetadataText(event.target.value)} rows={4} spellCheck={false} />
        </label>
        <div className="field-span-2 form-actions">
          <button type="submit" className="button button-primary">Generate QR</button>
          <p className="muted-text">QR includes profile text only; it never contains a face image or embedding.</p>
        </div>
      </form>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      {qrImage && (
        <div className="qr-generated" aria-live="polite">
          <img src={qrImage} alt={`Registration QR code for ${name}`} />
          <p>Scan this code to review the profile details on this device.</p>
          <a className="button button-secondary" href={qrImage} download={`visionid-${personId}.png`}>Download QR PNG</a>
        </div>
      )}
    </section>
  );
}
