import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

type PageKind = "services" | "use-cases" | "portfolio" | "pricing";

function LineIcon({ type }: { type: "render" | "model" | "video" | "agency" | "developer" | "studio" | "check" | "arrow" }) {
  const paths = {
    render: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 3-4 5 6" /></>,
    model: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" /></>,
    video: <><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /><path d="m9 9 4 3-4 3V9Z" /></>,
    agency: <><path d="M4 20V9l8-5 8 5v11" /><path d="M8 20v-5h8v5M9 10h.01M15 10h.01" /></>,
    developer: <><path d="m4 9 8-5 8 5v10l-8 2-8-2V9Z" /><path d="m4 9 8 5 8-5M12 14v7" /></>,
    studio: <><path d="M4 20V8l8-4 8 4v12" /><path d="M8 20v-5h8v5M8 10h.01M12 10h.01M16 10h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  };
  return <svg className="site-line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

const base = {
  services: { eyebrow: "What we make", title: <>One rough input.<br /><em>Every useful output.</em></>, intro: "The visual production layer between a first idea and the moment a client can finally see it." },
  "use-cases": { eyebrow: "Built for the work", title: <>Make the next<br /><em>conversation clearer.</em></>, intro: "Different teams need different proof. Pick the moment you need to move forward." },
  portfolio: { eyebrow: "Selected work", title: <>Spaces that feel<br /><em>already lived in.</em></>, intro: "A considered selection of worlds, details, and stories built from early-stage ideas." },
  pricing: { eyebrow: "Simple by design", title: <>Choose the pace<br /><em>your project needs.</em></>, intro: "Start with a clear output. Add depth as the idea becomes more real." },
};

const services = [
  ["render", "Photorealistic renders", "For pitches, listings, and the moment a material direction needs to feel tangible.", "/1.webp"],
  ["model", "Interactive 3D spaces", "For clients who need to explore the room, not just look at one angle.", "/ai-interactive.png"],
  ["video", "Cinematic walkthroughs", "For launches, investor decks, and spaces that need to be understood in motion.", "/homewalktrough.mp4"],
] as const;

const useCases = [
  ["agency", "Agencies", "Win the pitch before the meeting ends", "Turn a rough brief into a visual direction your team can sell, refine, and deliver.", "3× clearer direction"],
  ["developer", "Developers", "Help buyers feel the future home", "Use renders, plans, and walkthroughs to make unbuilt spaces concrete across marketing and sales.", "12K+ visual outputs"],
  ["studio", "Design studios", "Move from concept to detail", "Keep your craft in focus while we carry the heavy production work behind the scenes.", "48h first delivery"],
] as const;

const portfolio = [
  ["North light / 01", "Warm minimal apartment", "/firstimage.png", "Large render set"],
  ["Material study / 02", "Quiet textures, considered light", "/moodboard.png", "Material direction"],
  ["Arrival sequence / 03", "A home told in motion", "/fromto.png", "Cinematic story"],
  ["Interactive space / 04", "Explore every corner", "/home.png", "3D walkthrough"],
] as const;

const plans = [
  ["Essential", "For the first clear direction", "From $180", ["1 polished render direction", "2 revision rounds", "48-hour first delivery"]],
  ["Studio", "For teams shipping every week", "From $480", ["Render, plan, or video output", "Priority production", "Shared review rounds"]],
  ["World", "For spaces clients can enter", "Custom", ["Interactive 3D walkthrough", "Multiple image reconstruction", "White-label delivery"]],
] as const;

function SharedCta() { return <section className="site-page-cta"><p className="eyebrow">Have a space in mind?</p><h2>Bring the next idea<br />into focus.</h2><Link href="/signup">Start a project <span>↗</span></Link></section>; }

function ServicesPage() { return <><section className="site-page-hero service-hero"><div><p className="eyebrow">{base.services.eyebrow}</p><h1>{base.services.title}</h1><p>{base.services.intro}</p><Link className="hero-inline-link" href="/signup">Build your first output <span>↗</span></Link></div><div className="service-hero-art"><div className="service-art-frame"><span>INPUT</span><div className="art-sketch"><i /><i /><i /></div></div><div className="service-art-arrow"><LineIcon type="arrow" /></div><div className="service-art-result"><span>OUTPUT</span><div className="art-room"><b>living room</b></div></div></div></section><section className="service-list">{services.map(([icon, title, text, image], index) => <article className="service-row" key={title}><div className="service-row-number">0{index + 1}</div><div className="service-row-icon"><LineIcon type={icon} /></div><div className="service-row-copy"><h2>{title}</h2><p>{text}</p><Link href="/signup">Explore this output <span>↗</span></Link></div><div className="service-row-media" style={{ backgroundImage: `url('${image}')` }} /></article>)}</section><section className="service-proof-band"><div><p className="eyebrow">A production system that scales</p><h2>One brief.<br /><em>Many ways to move.</em></h2></div><div className="service-proof-stats"><strong>12K<span>+</span></strong><p>projects delivered</p><strong>40<span>+</span></strong><p>countries served</p></div></section></>; }

function UseCasesPage() { return <><section className="site-page-hero use-case-hero"><p className="eyebrow">{base["use-cases"].eyebrow}</p><h1>{base["use-cases"].title}</h1><p>{base["use-cases"].intro}</p></section><section className="use-case-grid">{useCases.map(([icon, label, title, text, metric]) => <article key={label}><div className="use-case-icon"><LineIcon type={icon} /></div><p className="eyebrow">{label}</p><h2>{title}</h2><p>{text}</p><div className="use-case-metric">{metric}<span>↗</span></div><Link href="/contact">Talk through your use case <span>↗</span></Link></article>)}</section><section className="use-case-quote"><p>“The best visual is the one that gets everyone aligned before the expensive decisions begin.”</p><span>HomeSketches / Studio principle</span></section></>; }

function PortfolioPage() { return <><section className="site-page-hero portfolio-hero"><p className="eyebrow">{base.portfolio.eyebrow}</p><h1>{base.portfolio.title}</h1><p>{base.portfolio.intro}</p><div className="portfolio-filter"><span className="active">All work</span><span>Still imagery</span><span>Motion</span><span>Interactive</span></div></section><section className="portfolio-bento">{portfolio.map(([label, title, image, type], index) => <article className={`portfolio-tile tile-${index + 1}`} key={label}><div className="portfolio-tile-image" style={{ backgroundImage: `url('${image}')` }} /><div className="portfolio-tile-overlay" /><div className="portfolio-tile-copy"><p>{label}</p><h2>{title}</h2><span>{type} <b>↗</b></span></div></article>)}</section><section className="portfolio-note"><div><p className="eyebrow">The detail is the difference</p><h2>Built to make<br /><em>people pause.</em></h2></div><p>Every image, plan, and walkthrough starts with the same question: what does someone need to understand or feel next?</p><Link href="/contact">Start a visual conversation <span>↗</span></Link></section></>; }

function PricingPage() { return <><section className="site-page-hero pricing-hero"><p className="eyebrow">{base.pricing.eyebrow}</p><h1>{base.pricing.title}</h1><p>{base.pricing.intro}</p><div className="pricing-assurance"><LineIcon type="check" /> No subscriptions. No hidden production fees. Just a clear next output.</div></section><section className="pricing-grid">{plans.map(([name, description, price, features], index) => <article className={`pricing-card ${index === 1 ? "featured" : ""}`} key={name}>{index === 1 && <span className="pricing-recommended">Most popular</span>}<p className="eyebrow">0{index + 1}</p><h2>{name}</h2><p>{description}</p><strong>{price}</strong><ul>{features.map((feature) => <li key={feature}><LineIcon type="check" />{feature}</li>)}</ul><Link href="/signup">Start with {name} <span>↗</span></Link></article>)}</section><section className="pricing-faq"><div><p className="eyebrow">Still deciding?</p><h2>Start with the output<br /><em>you need today.</em></h2></div><div><p>Most teams begin with one clear visual deliverable, then add motion or 3D when the project is ready. Your first conversation helps us recommend the right starting point.</p><Link href="/contact">Ask us what fits <span>↗</span></Link></div></section></>; }

export function MarketingPage({ kind }: { kind: PageKind }) { const content: Record<PageKind, ReactNode> = { services: <ServicesPage />, "use-cases": <UseCasesPage />, portfolio: <PortfolioPage />, pricing: <PricingPage /> }; return <main className={`site-page site-page-${kind}`}><SiteHeader />{content[kind]}<SharedCta /></main>; }
