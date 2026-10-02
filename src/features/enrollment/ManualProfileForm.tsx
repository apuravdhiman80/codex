import { useState, type FormEvent } from "react";
import { parsePersonQr, type ValidatedPersonPayload } from "../qr/qrSchema";

interface ManualProfileFormProps {
  existingIds?: string[];
  onPreview(payload: ValidatedPersonPayload): void;
}

export function ManualProfileForm({ existingIds = [], onPreview }: ManualProfileFormProps) {
  const [fields, setFields] = useState({ personId: "", name: "", role: "", department: "", email: "", phone: "", organization: "", metadata: "{}" });
  const [error, setError] = useState("");

  function update(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let metadata: unknown;
    try {
      metadata = fields.metadata.trim() ? JSON.parse(fields.metadata) as unknown : undefined;
    } catch {
      setError("Additional information must be valid JSON text.");
      return;
    }
    const parsed = parsePersonQr(JSON.stringify({
      version: 1,
      person_id: fields.personId,
      name: fields.name,
      role: fields.role,
      department: fields.department,
      email: fields.email,
      phone: fields.phone,
      organization: fields.organization,
      metadata,
    }), existingIds);
    if (!parsed.ok) {
      setError(parsed.error.message);
      return;
    }
    setError("");
    onPreview(parsed.value);
  }

  return (
    <form className="manual-profile-form" onSubmit={submit} aria-labelledby="manual-profile-heading">
      <div>
        <p className="eyebrow">MANUAL ENTRY</p>
        <h2 id="manual-profile-heading">Enter profile details</h2>
        <p className="muted-text">The same field validation is applied to QR and manual registration.</p>
      </div>
      <div className="form-grid">
        <label>Person ID<input value={fields.personId} onChange={(event) => update("personId", event.target.value)} required autoComplete="off" /></label>
        <label>Name<input value={fields.name} onChange={(event) => update("name", event.target.value)} required autoComplete="name" /></label>
        <label>Role<input value={fields.role} onChange={(event) => update("role", event.target.value)} autoComplete="organization-title" /></label>
        <label>Department<input value={fields.department} onChange={(event) => update("department", event.target.value)} /></label>
        <label>Email<input type="email" value={fields.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" /></label>
        <label>Phone<input type="tel" value={fields.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" /></label>
        <label>Organization<input value={fields.organization} onChange={(event) => update("organization", event.target.value)} autoComplete="organization" /></label>
        <label className="form-grid-wide">Additional metadata (JSON)<textarea value={fields.metadata} onChange={(event) => update("metadata", event.target.value)} rows={3} spellCheck={false} /></label>
      </div>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      <button className="button-primary" type="submit">Preview profile</button>
    </form>
  );
}
