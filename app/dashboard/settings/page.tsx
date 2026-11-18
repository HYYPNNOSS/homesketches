"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import { apiRequest } from "../../../lib/api";
type User = { id: string; name: string; email: string };

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    if (!localStorage.getItem("homesketches_access_token")) { setNotice("Sign in to load and update your profile."); setLoading(false); return; }
    try { const profile = await apiRequest<User>("/auth/me"); setUser(profile); setName(profile.name); setNotifications(localStorage.getItem(`homesketches-notifications-${profile.id}`) !== "false"); setNotice(""); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not load profile."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true); setNotice("");
    try {
      const profile = await apiRequest<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      setUser(profile); setName(profile.name);
      localStorage.setItem(`homesketches-notifications-${profile.id}`, String(notifications));
      setNotice("Profile saved. Notification preference saved in this browser.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save profile."); }
    finally { setBusy(false); }
  }
  return <StudioShell active="/dashboard/settings" eyebrow="Studio settings" title="Make the studio yours."><section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Profile</p><h2>How your team sees you.</h2></div></div>
    <form className="settings-form" onSubmit={save}><label>Display name<input required minLength={2} maxLength={80} disabled={!user || busy} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Email address<input value={user?.email ?? ""} readOnly placeholder="you@studio.com" /></label>
      <div className="settings-divider" /><div className="settings-row"><div><strong>Show completion messages</strong><small>Display a message when a Workspace generation finishes in this browser.</small></div><input type="checkbox" disabled={!user || busy} checked={notifications} onChange={e => setNotifications(e.target.checked)} /></div>
      <p className="studio-notice" role="status">{loading ? "Loading profile…" : notice}</p>
      {user ? <button className="generate-button" type="submit" disabled={busy || loading}>{busy ? "Saving…" : "Save preferences ↗"}</button> : <><Link className="subpage-action" href="/signin">Sign in ↗</Link> <button className="text-action" type="button" onClick={load} disabled={loading}>Retry</button></>}
    </form></section></StudioShell>;
}
