"use client";

import { FormEvent, useEffect, useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type User = { id: string; name: string; email: string };

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null); const [name, setName] = useState(""); const [notice, setNotice] = useState("Loading profile...");
  useEffect(() => { const token = localStorage.getItem("homesketches_access_token"); fetch(`${API_URL}/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then((response) => response.ok ? response.json() : null).then((data: User | null) => { setUser(data); setName(data?.name ?? ""); setNotice(data ? "Profile loaded from the API." : "Sign in to load your studio profile."); }).catch(() => setNotice("The API is unavailable.")); }, []);
  function save(event: FormEvent) { event.preventDefault(); setNotice("Profile changes are ready for the users update endpoint."); }
  return <StudioShell active="/dashboard/settings" eyebrow="Studio settings" title="Make the studio yours."><section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Profile</p><h2>How your team sees you.</h2><p>These details are loaded from your authenticated NestJS session.</p></div></div><form className="settings-form" onSubmit={save}><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label><label>Email address<input value={user?.email ?? ""} readOnly placeholder="you@studio.com" /></label><div className="settings-divider" /><div className="settings-row"><div><strong>Generation notifications</strong><small>Keep updates close while longer reconstructions process.</small></div><input type="checkbox" defaultChecked /></div><p className="studio-notice">{notice}</p><button className="generate-button" type="submit">Save preferences <span>↗</span></button></form></section></StudioShell>;
}
