import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { listProfiles } from "../../data/repositories/peopleRepository";
import { listTemplatesForPerson } from "../../data/repositories/templateRepository";
import type { PersonProfile } from "../../types/person";

type SortMode = "name" | "newest" | "recently_detected";

interface PeopleDirectoryProps {
  listProfiles?: () => Promise<PersonProfile[]>;
  listTemplates?: (personId: string) => Promise<unknown[]>;
}

function profileInitials(name: string): string {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function ProfileAvatar({ profile }: { profile: PersonProfile }) {
  const [photoUrl, setPhotoUrl] = useState<string>();
  useEffect(() => {
    if (!profile.photoBlob) return;
    const url = URL.createObjectURL(profile.photoBlob);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profile.photoBlob]);
  return <div className="person-avatar" aria-label={`${profile.name} initials`}>{photoUrl ? <img src={photoUrl} alt="" /> : profileInitials(profile.name)}</div>;
}

export function PeopleDirectory({
  listProfiles: loadProfiles = listProfiles,
  listTemplates = listTemplatesForPerson,
}: PeopleDirectoryProps) {
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [enrolled, setEnrolled] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadProfiles().then(async (loaded) => {
      const states = await Promise.all(loaded.map(async (profile) => [profile.id, !profile.isDemo && (await listTemplates(profile.id)).length > 0] as const));
      if (!active) return;
      setProfiles(loaded);
      setEnrolled(Object.fromEntries(states));
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Local people could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadProfiles, listTemplates]);

  const roles = useMemo(() => [...new Set(profiles.map((profile) => profile.role).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [profiles]);
  const visibleProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = profiles.filter((profile) => {
      const matchesQuery = !needle || [profile.name, profile.personId, profile.role, profile.department, profile.organization]
        .some((value) => value?.toLowerCase().includes(needle));
      return matchesQuery && (roleFilter === "all" || profile.role === roleFilter);
    });
    return filtered.sort((first, second) => {
      if (sort === "newest") return second.createdAt - first.createdAt;
      if (sort === "recently_detected") return (second.lastDetectedAt ?? 0) - (first.lastDetectedAt ?? 0);
      return first.name.localeCompare(second.name);
    });
  }, [profiles, query, roleFilter, sort]);

  return (
    <section className="people-directory" aria-labelledby="people-directory-heading">
      <div className="page-heading people-directory-heading">
        <div><p className="eyebrow">LOCAL PROFILE LIBRARY</p><h1 id="people-directory-heading">People Directory</h1><p>Search and manage this device's enrolled profiles.</p></div>
        <Link className="button-primary" to="/enroll">Enroll a Person</Link>
      </div>
      <div className="directory-toolbar">
        <label className="directory-search">Search people
          <input type="search" role="searchbox" aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, role, department" />
        </label>
        <label>Role
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">All roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="name">Name</option>
            <option value="newest">Recently added</option>
            <option value="recently_detected">Recently detected</option>
          </select>
        </label>
      </div>
      {loading && <p role="status">Loading local profiles…</p>}
      {error && <p className="inline-alert inline-alert-error" role="alert">{error}</p>}
      {!loading && !error && profiles.length === 0 && (
        <div className="empty-state"><p className="eyebrow">NO PROFILES YET</p><h2>No people enrolled yet</h2><p>Create a profile, then enroll face samples after consent.</p><Link className="button-primary" to="/enroll">Enroll a Person</Link></div>
      )}
      {!loading && !error && profiles.length > 0 && visibleProfiles.length === 0 && (
        <div className="empty-state"><h2>No profiles match</h2><p>Try another name, ID, or role.</p><button className="button-secondary" type="button" onClick={() => { setQuery(""); setRoleFilter("all"); }}>Clear filters</button></div>
      )}
      {visibleProfiles.length > 0 && (
        <div className="people-card-grid" aria-label={`${visibleProfiles.length} people`}>
          {visibleProfiles.map((profile) => (
            <article className="person-directory-card" key={profile.id}>
              <ProfileAvatar profile={profile} />
              <div className="person-card-heading"><div><h2>{profile.name}</h2><p>{profile.personId}</p></div><span className={profile.isDemo ? "demo-tag" : enrolled[profile.id] ? "enrolled-tag" : "unenrolled-tag"}>{profile.isDemo ? "DEMO DATA" : enrolled[profile.id] ? "ENROLLED" : "PROFILE ONLY"}</span></div>
              <dl className="person-card-fields">
                <div><dt>Role</dt><dd>{profile.role || "—"}</dd></div>
                <div><dt>Department</dt><dd>{profile.department || "—"}</dd></div>
                <div><dt>Organization</dt><dd>{profile.organization || "—"}</dd></div>
                <div><dt>Added</dt><dd>{new Date(profile.createdAt).toLocaleDateString()}</dd></div>
                <div><dt>Last detected</dt><dd>{profile.lastDetectedAt ? new Date(profile.lastDetectedAt).toLocaleString() : "Never"}</dd></div>
              </dl>
              <Link className="person-card-link" to={`/people/${encodeURIComponent(profile.id)}`}>View profile <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
