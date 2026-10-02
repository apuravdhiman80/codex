import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { PersonProfile } from "../../types/person";
import type { ValidatedPersonPayload } from "../qr/qrSchema";
import { QrScanner } from "../qr/QrScanner";
import { resolveEnrollmentServices, type EnrollmentServices } from "./enrollmentServices";
import { EnrollmentFlow } from "./EnrollmentFlow";
import { ManualProfileForm } from "./ManualProfileForm";

interface EnrollmentPageProps {
  services?: Partial<EnrollmentServices>;
  personId?: string;
}

export function EnrollmentPage({ services: serviceOverrides, personId: personIdProp }: EnrollmentPageProps) {
  const services = useMemo(() => resolveEnrollmentServices(serviceOverrides), [serviceOverrides]);
  const queryPersonId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("personId");
  const personId = personIdProp ?? queryPersonId;
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [payload, setPayload] = useState<ValidatedPersonPayload>();
  const [existingProfile, setExistingProfile] = useState<PersonProfile>();
  const [lookupError, setLookupError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(Boolean(personId));
  const [returnToProfile, setReturnToProfile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#qr-enrollment") {
      requestAnimationFrame(() => document.getElementById("qr-enrollment")?.scrollIntoView?.({ behavior: "smooth" }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void services.listProfiles().then((profiles) => {
      if (active) setExistingIds(profiles.map((profile) => profile.personId));
    }).catch((error: unknown) => {
      if (active) setLookupError(error instanceof Error ? error.message : "Local profiles could not be loaded.");
    });
    if (personId) {
      void services.getProfile(personId).then((profile) => {
        if (!active) return;
        if (profile) setExistingProfile(profile);
        else setLookupError("This profile could not be found. Return to the people directory and try again.");
        setLoadingProfile(false);
      }).catch((error: unknown) => {
        if (!active) return;
        setLookupError(error instanceof Error ? error.message : "The profile could not be loaded.");
        setLoadingProfile(false);
      });
    }
    return () => { active = false; };
  }, [personId, services]);

  function cancelPreview() {
    setPayload(undefined);
    if (personId && existingProfile) setReturnToProfile(true);
    else setExistingProfile(undefined);
    setLookupError("");
  }

  if (returnToProfile && existingProfile) {
    return <section className="enrollment-page"><div className="empty-state"><p className="eyebrow">ENROLLMENT CANCELLED</p><h1>Face samples were not changed</h1><p>{existingProfile.name}'s profile and current enrollment are still stored on this device.</p><Link className="button-primary" to={`/people/${encodeURIComponent(existingProfile.id)}`}>Return to person profile</Link></div></section>;
  }

  return (
    <section className="enrollment-page">
      {loadingProfile ? <p role="status">Loading person profile...</p> : null}
      {lookupError && <p className="inline-alert inline-alert-error" role="alert">{lookupError}</p>}
      {personId && !loadingProfile && !existingProfile ? (
        <div className="empty-state"><h1>Person Profile</h1><p>This profile is not available on this device.</p><Link to="/people">Back to People Directory</Link></div>
      ) : existingProfile ? (
        <EnrollmentFlow existingProfile={existingProfile} services={serviceOverrides} onCancel={cancelPreview} />
      ) : payload ? (
        <EnrollmentFlow payload={payload} services={serviceOverrides} onCancel={cancelPreview} />
      ) : !loadingProfile && (
        <>
          <header className="page-heading">
            <p className="eyebrow">PERSON REGISTRATION</p>
            <h1>Enroll a Person</h1>
            <p>Scan a person QR or enter the details manually. Review the profile before saving it to this device.</p>
            <p className="muted-text">Camera frames are discarded after local processing. Face descriptors stay on this device. Camera recognition begins only after you record consent.</p>
          </header>
          <div className="enrollment-entry-grid">
            <div id="qr-enrollment"><QrScanner
              existingIds={existingIds}
              onValidPayload={setPayload}
              onError={() => undefined}
            /></div>
            <ManualProfileForm existingIds={existingIds} onPreview={setPayload} />
          </div>
          <p className="muted-text">Need to view an enrolled person? <Link to="/people">Open the person directory</Link>.</p>
        </>
      )}
    </section>
  );
}
