import { useState, type FormEvent } from "react";
import type { PersonProfile, PersonProfilePatch } from "../../types/person";

interface ProfileEditorProps {
  profile: PersonProfile;
  onSave(patch: PersonProfilePatch): Promise<void>;
  onCancel(): void;
}

export function ProfileEditor({ profile, onSave, onCancel }: ProfileEditorProps) {
  const [values, setValues] = useState({
    name: profile.name, personId: profile.personId, role: profile.role, department: profile.department,
    organization: profile.organization ?? "", email: profile.email ?? "", phone: profile.phone ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(values);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="profile-editor surface-card" onSubmit={submit} aria-labelledby="profile-editor-heading">
      <h2 id="profile-editor-heading">Edit profile</h2>
      <div className="form-grid">
        <label>Name<input value={values.name} onChange={(event) => update("name", event.target.value)} required /></label>
        <label>Person ID<input value={values.personId} onChange={(event) => update("personId", event.target.value)} required /></label>
        <label>Role<input value={values.role} onChange={(event) => update("role", event.target.value)} /></label>
        <label>Department<input value={values.department} onChange={(event) => update("department", event.target.value)} /></label>
        <label>Organization<input value={values.organization} onChange={(event) => update("organization", event.target.value)} /></label>
        <label>Email<input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label>Phone<input type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} /></label>
      </div>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      <div className="button-row">
        <button className="button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <button className="button-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
