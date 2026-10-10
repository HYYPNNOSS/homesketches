import { For, Show, createMemo, createSignal, createUniqueId, onMount, type JSX } from 'solid-js';
import { defaultAboutLinks, type AboutLinks } from './config';
import './about.css';

export interface AboutNglobPageProps {
  links?: Partial<AboutLinks>;
  assetBase?: string;
  class?: string;
}

function Arrow(props: { down?: boolean }) {
  return <svg class="ng-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={props.down ? { transform: 'rotate(90deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}
function Plus() { return <span class="ng-plus" aria-hidden="true"><span /><span /></span>; }
function Chapter(props: { number: string; children: JSX.Element; light?: boolean }) {
  return <p class={`ng-chapter${props.light ? ' ng-chapter-light' : ''}`}><span>{props.number}</span>{props.children}</p>;
}

function TrackingPreview() {
  return <div class="ng-product-preview ng-tracking-preview">
    <div class="ng-preview-top"><strong>Your move, in view.</strong><span>Example journey</span></div>
    <div class="ng-tracking-map">
      <svg viewBox="0 0 700 430" aria-hidden="true">
        <defs><pattern id="ng-streets" width="90" height="74" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><rect x="8" y="8" width="65" height="47" rx="2" fill="#e7e6df" /><path d="M0 65H90M82 0V74" stroke="#fffefb" stroke-width="11" /></pattern></defs>
        <rect width="700" height="430" fill="#f1f0e9"/><rect width="700" height="430" fill="url(#ng-streets)"/>
        <path d="M-40 315C50 170 135 280 235 295S395 95 515 175 630 335 755 235" fill="none" stroke="#b6d9e3" stroke-width="49"/>
        <path d="M165 0 228 131 285 200 396 240 511 430M0 110 290 197 700 80" fill="none" stroke="#fffefb" stroke-width="17"/>
        <path d="m360 20 105 20-15 86-93-23Z" fill="#cbd8bd"/><path d="m61 286 93-28 37 105-104 14Z" fill="#cbd8bd"/>
        <path d="M193 159 286 196 396 240 503 208" fill="none" stroke="#a78043" stroke-width="5" stroke-dasharray="3 10" stroke-linecap="round"/>
        <circle cx="193" cy="159" r="9" fill="#0b1f44" stroke="white" stroke-width="4"/><circle cx="503" cy="208" r="11" fill="white" stroke="#0b1f44" stroke-width="4"/>
        <g transform="translate(345 218)"><circle r="31" fill="white" opacity=".75"/><circle r="24" fill="#0b1f44"/><path d="M-11-7H3V6H-11V-7ZM3-2H8L13 3V6H3" fill="none" stroke="white" stroke-width="1.8"/><circle cx="-6" cy="8" r="2.7" fill="white"/><circle cx="8" cy="8" r="2.7" fill="white"/></g>
      </svg>
      <span class="ng-map-location ng-map-collection">Collection</span><span class="ng-map-location ng-map-destination">Destination</span>
      <div class="ng-map-note"><span class="ng-status-dot"/><span>Your team is on the way</span></div>
    </div>
  </div>;
}

function ScanPreview(props: { image: string }) {
  return <div class="ng-product-preview ng-scan-preview">
    <div class="ng-preview-top"><strong>A clearer picture.</strong><span>Photo Scan example</span></div>
    <div class="ng-scan-scene"><img src={props.image} alt="Three boxes, one armchair and one potted plant in a room" width="1536" height="1024" loading="lazy"/><span class="ng-scan-corner ng-scan-corner-a"/><span class="ng-scan-corner ng-scan-corner-b"/></div>
    <div class="ng-scan-inventory"><div><span>Boxes</span><strong>3</strong></div><div><span>Armchair</span><strong>1</strong></div><div><span>Plant</span><strong>1</strong></div></div>
    <p class="ng-preview-caption">Your belongings, ready to review.</p>
  </div>;
}

function AccountPreview() {
  return <div class="ng-product-preview ng-account-preview">
    <div class="ng-preview-top"><strong>Your space at Nglob.</strong><span>Account example</span></div>
    <div class="ng-account-body"><p class="ng-account-greeting">A little more organised.</p><h4>Everything for<br/> your next chapter.</h4>
      <div class="ng-account-row"><span class="ng-account-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2"/></svg></span><div><strong>Your bookings</strong><p>Plans and service details, together.</p></div></div>
      <div class="ng-account-row"><span class="ng-account-symbol">≡</span><div><strong>Your belongings</strong><p>The details that make a difference.</p></div></div>
      <div class="ng-account-row"><span class="ng-account-symbol">↺</span><div><strong>Your Nglob Credit</strong><p>A little something for what comes next.</p></div></div>
    </div>
  </div>;
}

export function AboutNglobPage(props: AboutNglobPageProps) {
  const links = createMemo(() => ({ ...defaultAboutLinks, ...props.links }));
  const asset = (name: string) => `${(props.assetBase || '/nglob-about/assets').replace(/\/$/, '')}/${name}`;
  const uid = createUniqueId();
  const [enhanced, setEnhanced] = createSignal(false);
  onMount(() => setEnhanced(true));
  const handleTabKey = (event: KeyboardEvent, active: number, setActive: (value: number) => void, kind: string) => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' ? 0 : key === 'End' ? 2 : (active + (key === 'ArrowLeft' || key === 'ArrowUp' ? 2 : 1)) % 3;
    setActive(next);
    document.getElementById(`${uid}-${kind}-button-${next}`)?.focus();
  };
  const [openCare, setOpenCare] = createSignal<number | null>(0);
  const [city, setCity] = createSignal(0);
  const [technology, setTechnology] = createSignal(0);
  const care = [
    { title: 'Our people', text: 'Around 90% of our team is in-house. When we need extra capacity, we bring in carefully verified, highly rated professionals. People we trust with the things you trust us with.' },
    { title: 'Our responsibility', text: 'The belongings, the access, the timing — and the little things you want us to know. We bring the whole job together. Whoever carries out the work, Nglob remains responsible for the service agreed with you.', link: 'Read our service standards', href: () => links().standards },
    { title: 'Protection, clearly explained', text: 'Insurance is part of the protection behind our service. Cover applies under the policy terms. We explain the cover and your responsibilities before you confirm your booking.', link: 'See the terms of cover', href: () => links().terms },
  ];
  const stories = [
    { name: 'At home', number: '01', heading: 'A new address.\nThe same favourite things.', text: 'A much-loved chair. Your first set of keys. From a few things to a home full of memories, we make room for what comes next.', link: 'Home moving', href: () => links().homeMoving },
    { name: 'Between terms', number: '02', heading: 'New term.\nLess to carry.', text: 'A room, a fresh start, a city to get to know. Moving and managed storage fit around student life, including the space between terms.', link: 'Student moving', href: () => links().studentMoving },
    { name: 'At work', number: '03', heading: 'Good things\nare taking shape.', text: 'A first studio or a growing business. We help move the things that keep work moving, from everyday deliveries to bigger changes.', link: 'Business services', href: () => links().business },
  ];
  const tech = [
    { title: 'Follow your move', label: 'REAL-TIME TRACKING', text: 'See where your vehicle is and follow its progress. A clearer view of the journey, with less to wonder about.' },
    { title: 'Start with a picture', label: 'PHOTO SCAN', text: 'Share photos or a short video. Photo Scan recognises your belongings and helps build an item list you can review, so fewer details depend on guesswork.' },
    { title: 'Keep it all together', label: 'YOUR ACCOUNT', text: 'Your bookings, important move details and Nglob Credit, in one familiar place. Easy to find when you need them.' },
  ];
  const faq = [
    { question: 'Do you work outside London?', answer: 'London is at the heart of Nglob, and our services extend across England. The options available for your journey are shown when you plan your move.' },
    { question: 'Can my business pay by invoice?', answer: 'Approved business customers can pay by invoice after the work is completed, under agreed payment terms. Our team can help arrange the right setup for your business.' },
    { question: 'Can I ask a question before booking?', answer: 'Of course. Tell us what you have in mind, or what you are unsure about. Our team can help you understand the options before you decide.', link: 'Contact our team', href: () => links().contact },
  ];

  return <main id="main" class={`nglob-about${props.class ? ` ${props.class}` : ''}`}>
    <noscript><style>{`.nglob-about .ng-expand,.nglob-about .ng-tech-description{grid-template-rows:1fr!important;opacity:1!important}.nglob-about .ng-story-panels{display:block!important;height:auto!important}.nglob-about .ng-story-panel>button,.nglob-about .ng-story-panel:not(.is-active)>button{writing-mode:horizontal-tb!important;height:auto!important;min-height:75px!important}.nglob-about .ng-story-content{display:block!important;opacity:1!important}.nglob-about button .ng-plus{display:none!important}.nglob-about .ng-life-stage{display:block!important;grid-template-columns:1fr!important;height:auto!important;min-height:0!important}.nglob-about .ng-object-scene{height:auto!important;aspect-ratio:1.5}.nglob-about .ng-story-content>div{padding:10px 28px 28px}.nglob-about .ng-object-scene>img{object-fit:contain!important}`}</style></noscript>
    <section class="ng-hero" aria-labelledby={`${uid}-title`}>
      <div class="ng-shell ng-hero-heading"><div><Chapter number="01">ABOUT NGLOB</Chapter><h1 id={`${uid}-title`}>London life.<br/> <span>Carefully moved.</span></h1></div><div class="ng-hero-intro"><p>A city full of next chapters.<br/> We’re here for yours.</p><p>Moving, delivery and managed storage, brought together by thoughtful people and useful technology.</p><a class="ng-text-link" href="#our-approach">Explore our story <Arrow down/></a></div></div>
      <div class="ng-hero-panorama"><img src={asset('london.webp')} alt="Everyday life on a London street, with warm brick homes, neighbourhood shops and people passing by" width="1942" height="809" fetchpriority="high"/><div class="ng-hero-photo-caption"><span>LONDON, IN THE EVERYDAY DETAILS.</span><span>Our home. Your next chapter.</span></div></div>
      <nav class="ng-shell ng-story-nav" aria-label="Explore About Nglob"><span>Take a closer look</span><a href="#our-approach">People</a><a href="#useful-technology">Technology</a><a href="#room-for-life">Storage</a></nav>
    </section>

    <section id="our-approach" class="ng-people ng-paper" aria-labelledby={`${uid}-people-title`}><div class="ng-shell ng-people-grid">
      <div class="ng-people-intro"><Chapter number="02">CARE IS A HUMAN THING</Chapter><h2 id={`${uid}-people-title`}>Good hands.<br/> A clear promise.</h2><p>Moving is practical.<br/> What you’re moving is personal.</p><div class="ng-team-number"><div><small>Around</small><span>90<span>%</span></span></div><p>Our own team.<br/> <span>People who know the work, and the care it takes.</span></p></div></div>
      <div class="ng-care-rows"><For each={care}>{(item, index) => <div class={`ng-care-row${openCare() === index() ? ' is-open' : ''}`}><h3><button id={`${uid}-care-button-${index()}`} type="button" aria-expanded={openCare() === index()} aria-controls={`${uid}-care-panel-${index()}`} disabled={!enhanced()} onClick={() => setOpenCare(openCare() === index() ? null : index())}><span>{item.title}</span><Plus/></button></h3><div id={`${uid}-care-panel-${index()}`} class="ng-expand" role="region" aria-labelledby={`${uid}-care-button-${index()}`} aria-hidden={enhanced() && openCare() !== index()} inert={enhanced() && openCare() !== index()}><div><p>{item.text}</p><Show when={item.link}><a class="ng-text-link" href={item.href?.()}>{item.link} <Arrow/></a></Show></div></div></div>}</For><p class="ng-care-signoff">Considered from the first detail to the last.</p></div>
    </div></section>

    <section class="ng-life" aria-labelledby={`${uid}-life-title`}><div class="ng-shell"><div class="ng-life-heading"><div><Chapter number="03">PART OF CITY LIFE</Chapter><h2 id={`${uid}-life-title`}>Life doesn’t<br/> stand still.</h2></div><p>And neither do the things around it.<br/> Different lives. Different plans.<br/> One familiar name to turn to.</p></div>
      <div class="ng-life-stage"><div class="ng-object-scene"><img src={asset('objects.webp')} alt="A colourful collection of personal belongings: a reading chair, books, a lamp and familiar everyday objects" width="1536" height="1024" loading="lazy"/><span class="ng-object-caption">THE THINGS THAT MAKE A PLACE YOURS.</span></div><div class="ng-story-panels" role="tablist" aria-label="Nglob for everyday life"><For each={stories}>{(story, index) => <div class={`ng-story-panel ng-story-${index()}${city() === index() ? ' is-active' : ''}`}><button type="button" role="tab" aria-selected={city() === index()} tabIndex={city() === index() ? 0 : -1} disabled={!enhanced()} onKeyDown={event => handleTabKey(event, city(), setCity, 'story')} aria-controls={`${uid}-story-panel-${index()}`} id={`${uid}-story-button-${index()}`} onClick={() => setCity(index())}><span class="ng-story-no">{story.number}</span><span>{story.name}</span><Plus/></button><div role="tabpanel" id={`${uid}-story-panel-${index()}`} aria-labelledby={`${uid}-story-button-${index()}`} class="ng-story-content" aria-hidden={enhanced() && city() !== index()} inert={enhanced() && city() !== index()}><div><h3>{story.heading}</h3><p>{story.text}</p><a class="ng-text-link" href={story.href()}>{story.link} <Arrow/></a></div></div></div>}</For></div></div>
    </div></section>

    <section id="useful-technology" class="ng-technology" aria-labelledby={`${uid}-tech-title`}><div class="ng-shell"><div class="ng-tech-heading"><div><Chapter number="04">A LOT GOES INTO SIMPLE</Chapter><h2 id={`${uid}-tech-title`}>The thinking behind<br/> the easy feeling.</h2></div><p>People, routes, access and timing.<br/> Connected behind the scenes.<br/> Clear where it matters to you.</p></div><div class="ng-technology-grid"><div class="ng-tech-controls" role="tablist" aria-label="Explore Nglob technology"><For each={tech}>{(item, index) => <div class={`ng-tech-row${technology() === index() ? ' is-active' : ''}`}><button type="button" role="tab" id={`${uid}-tech-button-${index()}`} aria-selected={technology() === index()} tabIndex={technology() === index() ? 0 : -1} disabled={!enhanced()} onKeyDown={event => handleTabKey(event, technology(), setTechnology, 'tech')} aria-controls={`${uid}-tech-panel`} onClick={() => setTechnology(index())}><span>{item.title}</span><Plus/></button><div class="ng-tech-description" aria-hidden={enhanced() && technology() !== index()} inert={enhanced() && technology() !== index()}><div><span>{item.label}</span><p>{item.text}</p></div></div></div>}</For><p class="ng-planning-note">Thoughtful planning makes good use of time and capacity. It helps keep pricing reasonable and the whole service well organised.</p></div><div class="ng-product-stage" role="tabpanel" id={`${uid}-tech-panel`} aria-labelledby={`${uid}-tech-button-${technology()}`}><Show when={technology() === 0}><TrackingPreview/></Show><Show when={technology() === 1}><ScanPreview image={asset('scan.webp')}/></Show><Show when={technology() === 2}><AccountPreview/></Show></div></div><div class="ng-system-strip" aria-label="What we bring together"><span>The details</span><span class="ng-strip-dash"/><span>The right people</span><span class="ng-strip-dash"/><span>A considered plan</span><span class="ng-strip-dash"/><strong>A clearer day.</strong></div></div></section>

    <section id="room-for-life" class="ng-storage" aria-labelledby={`${uid}-storage-title`}><div class="ng-shell ng-storage-grid"><div class="ng-storage-copy"><Chapter number="05" light>A LITTLE MORE ROOM</Chapter><h2 id={`${uid}-storage-title`}>Keep what matters.<br/> <span>Make space for now.</span></h2><p>Between homes. During a renovation. While a business changes shape. Sometimes a little space makes all the difference.</p><p>We collect your belongings, look after them in our managed warehouses and arrange their return when you need them.</p><a class="ng-text-link" href={links().storage}>Explore managed storage <Arrow/></a></div><div class="ng-storage-scene"><img src={asset('storage.webp')} alt="Carefully protected furniture and belongings, ready for managed storage" width="1536" height="1024" loading="lazy"/></div><div class="ng-storage-bottom"><div class="ng-storage-journey"><div><span>01</span><strong>We collect.</strong></div><i/><div><span>02</span><strong>We store.</strong></div><i/><div><span>03</span><strong>We return.</strong></div></div><details class="ng-storage-details"><summary>Storage that comes to you <Plus/></summary><p>Our warehouses are managed by Nglob. Customer visits aren’t available — collection and return are part of the service, so you don’t need to make the trip.</p></details></div></div></section>

    <section class="ng-loyalty ng-paper" aria-labelledby={`${uid}-loyalty-title`}><div class="ng-shell ng-loyalty-grid"><div class="ng-loop-art" aria-hidden="true"><svg viewBox="0 0 300 180"><path d="M258 69C222 11 71 6 37 71S91 171 149 132 191 42 249 60 302 151 207 164"/><circle cx="207" cy="164" r="5"/></svg><span>AGAIN.<br/> AND AGAIN.</span></div><div><Chapter number="06">BEYOND ONE MOVE</Chapter><h2 id={`${uid}-loyalty-title`}>Life moves.<br/> We stay familiar.</h2></div><div class="ng-loyalty-copy"><h3>Move Pays Back</h3><p>Earn Nglob Credit through eligible referrals, then use it towards future services. A little something for what comes next.</p><a class="ng-text-link" href={links().account}>Explore your account <Arrow/></a></div></div></section>

    <section class="ng-good-to-know" aria-labelledby={`${uid}-faq-title`}><div class="ng-shell"><div class="ng-faq-grid"><div><Chapter number="07">GOOD TO KNOW</Chapter><h2 id={`${uid}-faq-title`}>A few things<br/> worth knowing.</h2><a class="ng-text-link" href={links().help}>Visit the Help Centre <Arrow/></a></div><div class="ng-faq-list"><For each={faq}>{item => <details><summary>{item.question}<Plus/></summary><div class="ng-faq-answer"><p>{item.answer}</p><Show when={item.link}><a class="ng-text-link" href={item.href?.()}>{item.link} <Arrow/></a></Show></div></details>}</For></div></div><div class="ng-company-line" id="company-details"><p><strong>The company behind the name.</strong><br/> Nglob is a trading name of ANB OPTIMUM CAPITAL LTD.<br/> Registered in England and Wales. Company number 13546899.</p><p>Registered office:<br/> 58a High Street, Whitton, Twickenham, TW2 7LT.<br/> <a href={links().companyRegistration}>View company registration <Arrow/></a></p></div><div class="ng-final-line"><p>For the things that move your life.</p><strong>Moving? <span>Nglob it.</span></strong><svg viewBox="0 0 410 74" aria-hidden="true"><path d="M1 43C119 78 191-20 274 25S360 74 405 2"/><circle cx="405" cy="2" r="3"/></svg></div></div></section>
  </main>;
}
