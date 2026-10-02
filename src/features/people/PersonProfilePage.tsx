import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import type { PersonProfile, PersonProfilePatch, FaceTemplate } from "../../types/person";
import type { DetectionEvent } from "../../types/events";
import { resolveEnrollmentServices, type EnrollmentServices } from "../enrollment/enrollmentServices";
import { ProfileEditor } from "./ProfileEditor";

interface PersonProfilePageProps {
  personId?: string;
  services?: Partial<EnrollmentServices>;
}

function labelEvent(event: DetectionEvent): string {
  if (event.type === "person_recognized") return "Face recognized";
  if (event.type === "unknown_face") return "Unknown person";
  if (event.type === "face_detected") return "Face detected";
  return "Object detected";
}

function ProfilePhoto({ profile }: { profile: PersonProfile }) {
  const [photoUrl, setPhotoUrl] = useState<string>();
  useEffect(() => {
    if (!profile.photoBlob) return;
    const url = URL.createObjectURL(profile.photoBlob);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profile.photoBlob]);
  const initials = profile.name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <div className="person-profile-avatar">{photoUrl ? <img src={photoUrl} alt={`${profile.name} profile`} /> : initials}</div>;
}

export function PersonProfilePage({ personId: personIdProp, services: serviceOverrides }: PersonProfilePageProps) {
  const params = useParams();
  const personId = personIdProp ?? params.personId ?? "";
  const services = useMemo(() => resolveEnrollmentServices(serviceOverrides), [serviceOverrides]);
  const [profile, setProfile] = useState<PersonProfile>();
  const [templates, setTemplates] = useState<FaceTemplate[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!personId) {
      setError("Person profile identifier is missing.");
      setLoading(false);
      return;
    }
    void Promise.all([
      services.getProfile(personId),
      services.listTemplatesForPerson(personId),
      services.queryPersonEvents(personId),
    ]).then(([loadedProfile, loadedTemplates, loadedEvents]) => {
      if (!active) return;
      setProfile(loadedProfile);
      setTemplates(loadedTemplates);
      setEvents(loadedEvents);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Person details could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [personId, services]);

  async function saveChanges(patch: PersonProfilePatch) {
    const updated = await services.updateProfile(personId, patch);
    setProfile(updated);
    setEditing(false);
  }

  async function deletePerson() {
    try {
      await services.deleteProfile(personId);
      setDeleted(true);
      setConfirmDelete(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Person data could not be deleted.");
      setConfirmDelete(false);
    }
  }

  if (loading) return <section className="person-profile-page"><h1>Person Profile</h1><p role="status">Loading person profile…</p></section>;
  if (deleted) return <section className="person-profile-page"><div className="empty-state" role="status"><h1>Person data deleted</h1><p>Profile, face samples, and linked detection events were removed from this device.</p><Link className="button-primary" to="/people">Return to People Directory</Link></div></section>;
  if (error && !profile) return <section className="person-profile-page"><h1>Person Profile</h1><p className="inline-alert inline-alert-error" role="alert">{error}</p><Link to="/people">Back to directory</Link></section>;
  if (!profile) return <section className="person-profile-page"><h1>Person Profile</h1><p role="alert">Person profile was not found.</p><Link to="/people">Back to directory</Link></section>;

  const recognitionEvents = events.filter((event) => event.type === "person_recognized");
  return (
    <section className="person-profile-page" aria-labelledby="person-profile-heading">
      <p className="eyebrow"><Link to="/people">PEOPLE DIRECTORY</Link> / PROFILE</p>
      <header className="person-profile-header">
        <ProfilePhoto profile={profile} />
        <div className="person-profile-title"><h1 id="person-profile-heading">{profile.name}</h1><p>{profile.personId} · {profile.role || "No role"} · {profile.department || "No department"}</p><span className={profile.isDemo ? "demo-tag" : templates.length ? "enrolled-tag" : "unenrolled-tag"}>{profile.isDemo ? "DEMO DATA · NOT ENROLLED" : templates.length ? "FACE ENROLLED" : "PROFILE ONLY"}</span></div>
        <div className="person-profile-actions">
          {!profile.isDemo && <Link className="button-primary" to={`/enroll?personId=${encodeURIComponent(profile.id)}`}>Re-enroll face</Link>}
          <button className="button-secondary" type="button" disabled={profile.isDemo} onClick={() => setEditing((value) => !value)}>{editing ? "Close editor" : "Edit profile"}</button>
          <button className="button-danger" type="button" disabled={profile.isDemo} onClick={() => setConfirmDelete(true)}>Delete person</button>
        </div>
      </header>
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      {editing && <ProfileEditor profile={profile} onSave={saveChanges} onCancel={() => setEditing(false)} />}

      {confirmDelete && (
        <div className="confirm-scrim">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-person-heading" aria-describedby="delete-person-description">
            <p className="eyebrow">DELETE LOCAL PERSON DATA</p>
            <h2 id="delete-person-heading">Delete {profile.name}?</h2>
            <p id="delete-person-description">This permanently removes the profile, {templates.length} face templates, and linked detection events from this device.</p>
            <div className="button-row"><button className="button-danger" type="button" onClick={() => void deletePerson()}>Confirm delete</button><button className="button-secondary" type="button" onClick={() => setConfirmDelete(false)}>Keep person</button></div>
          </section>
        </div>
      )}

      <div className="profile-stats-grid">
        <article><span>FACE SAMPLES</span><strong>{templates.length}</strong></article>
        <article><span>RECOGNITION EVENTS</span><strong>{recognitionEvents.length}</strong></article>
        <article><span>FIRST REGISTERED</span><strong>{new Date(profile.createdAt).toLocaleDateString()}</strong></article>
        <article><span>LAST DETECTED</span><strong>{profile.lastDetectedAt ? new Date(profile.lastDetectedAt).toLocaleString() : "Never"}</strong></article>
      </div>

      <div className="person-profile-columns">
        <section className="surface-card" aria-labelledby="profile-details-heading">
          <p className="eyebrow">PERSON INFORMATION</p><h2 id="profile-details-heading">Profile details</h2>
          <dl className="profile-preview-grid">
            <div><dt>Role</dt><dd>{profile.role || "—"}</dd></div><div><dt>Department</dt><dd>{profile.department || "—"}</dd></div>
            <div><dt>Organization</dt><dd>{profile.organization || "—"}</dd></div><div><dt>Email</dt><dd>{profile.email || "—"}</dd></div>
            <div><dt>Phone</dt><dd>{profile.phone || "—"}</dd></div><div><dt>Enrollment consent</dt><dd>{new Date(profile.consentRecordedAt).toLocaleString()}</dd></div>
          </dl>
        </section>
        <section className="surface-card" aria-labelledby="person-history-heading">
          <p className="eyebrow">LOCAL DETECTION HISTORY</p><h2 id="person-history-heading">Recent detections</h2>
          {events.length === 0 ? <p className="muted-text">No detection events are recorded for this person yet.</p> : (
            <ol className="person-event-list">{events.slice(0, 20).map((event) => <li key={event.id}><time dateTime={new Date(event.timestamp).toISOString()}>{new Date(event.timestamp).toLocaleString()}</time><span>{labelEvent(event)}</span>{event.detectorConfidence !== undefined && <small>Detector {Math.round(event.detectorConfidence * 100)}%</small>}{event.recognitionSimilarity !== undefined && <small>Match {Math.round(event.recognitionSimilarity * 100)}%</small>}</li>)}</ol>
          )}
        </section>
      </div>
    </section>
  );
}
