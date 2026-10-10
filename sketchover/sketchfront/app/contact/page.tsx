"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../components/site/SiteHeader";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSent(true); }
  return <main className="site-page contact-page"><SiteHeader /><section className="contact-layout"><div className="contact-copy"><p className="eyebrow">Start a conversation</p><h1>Tell us what<br /><em>you’re building.</em></h1><p>Share a little about the space, the inputs you have, and where you want the idea to go. We’ll come back with the clearest next step.</p><div className="contact-details"><span>hello@homesketches.com</span><span>Available worldwide · Mon–Fri</span></div></div><form className="contact-form" onSubmit={submit}>{sent ? <div className="contact-success"><span>✓</span><h2>Message received.</h2><p>We’ll be in touch with a useful next step soon.</p><Link href="/">Back to HomeSketches <span>↗</span></Link></div> : <><label>Your name<input required placeholder="Jane Smith" /></label><label>Work email<input required type="email" placeholder="jane@studio.com" /></label><label>What are you working on?<select defaultValue=""><option value="" disabled>Choose a project type</option><option>Interior visualization</option><option>Real estate launch</option><option>Architecture presentation</option><option>Something else</option></select></label><label>Tell us a little more<textarea required placeholder="What do you have already, and what would you like to make?" /></label><button className="site-form-button" type="submit">Send inquiry <span>↗</span></button></>}</form></section></main>;
}
