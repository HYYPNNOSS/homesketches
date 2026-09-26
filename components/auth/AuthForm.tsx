"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "register" ? { name, email, password } : { email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message ?? "Something went wrong");
      localStorage.setItem("homesketches_access_token", data.accessToken);
      window.location.href = "/dashboard";
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to connect to the API"); } finally { setIsSubmitting(false); }
  }

  return <main className="auth-page">
    <section className="auth-visual"><Link href="/" className="auth-logo"><Image src="/logo1.png" alt="HomeSketches" width={42} height={42} /><span>HomeSketches</span></Link><div className="auth-visual-copy"><p className="eyebrow">Your studio, in one place</p><h1>Make space for better ideas.</h1><p>Turn the roughest sketch into a space your clients can feel.</p></div><div className="auth-visual-note"><span>01</span><span>Sketches become spaces</span></div></section>
    <section className="auth-panel"><div className="auth-form-wrap"><div className="auth-mobile-logo"><Image src="/logo1.png" alt="HomeSketches" width={40} height={40} /></div><div className="auth-heading"><p className="eyebrow">{mode === "login" ? "Welcome back" : "Begin here"}</p><h2>{mode === "login" ? "Sign in to your studio" : "Create your studio account"}</h2><p>{mode === "login" ? "Continue where your best ideas begin." : "Start shaping spaces with your team."}</p></div><div className="auth-toggle"><Link className={mode === "login" ? "active" : ""} href="/signin">Sign in</Link><Link className={mode === "register" ? "active" : ""} href="/signup">Create account</Link></div><form onSubmit={handleSubmit} className="auth-form">{mode === "register" && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required minLength={2} /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Connecting..." : mode === "login" ? "Enter your studio" : "Create your account"}<span>↗</span></button></form><p className="auth-legal">By continuing, you agree to the HomeSketches terms and privacy policy.</p></div></section>
  </main>;
}
