import { assets } from './assets';
import { Icon } from './Icon';

const navigation = [
  ['Personal', 'https://www.nglob.com/'],
  ['Business', 'https://www.nglob.com/business'],
  ['Storage', 'https://www.nglob.com/#how-it-works-storage'],
  ['Partners', 'https://www.nglob.com/partner'],
] as const;

export function SiteHeader(props: {
  menuOpen: boolean;
  onMenuToggle: () => void;
  menuId: string;
  menuRef: (element: HTMLButtonElement) => void;
}) {
  return <>
    <header class="site-header">
      <a class="brand" href="https://www.nglob.com/" aria-label="Nglob home">
        <img src={assets.logo} alt="Nglob" width={112} height={44} />
      </a>
      <nav class="desktop-nav" aria-label="Main navigation">
        {navigation.map(([label, href]) => <a href={href}>{label}</a>)}
      </nav>
      <div class="header-actions">
        <a href="https://www.nglob.com/?login=true" class="header-login">Log in</a>
        <a href="https://app.nglob.com/" class="button">Get my price</a>
        <button type="button" class="menu-toggle" ref={props.menuRef} onClick={props.onMenuToggle}
          aria-label={props.menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={props.menuOpen} aria-controls={props.menuId}>
          <Icon name={props.menuOpen ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
    <nav class={`mobile-nav${props.menuOpen ? ' is-open' : ''}`} id={props.menuId} aria-label="Mobile navigation">
      {navigation.map(([label, href]) => <a href={href}>{label}</a>)}
      <a href="https://www.nglob.com/?login=true">Log in</a>
    </nav>
  </>;
}

const footerGroups = [
  { label: 'Services', links: [
    ['Home moving', 'https://www.nglob.com/services/home-relocation'],
    ['Few items', 'https://www.nglob.com/services/few-items'],
    ['Student moving', 'https://www.nglob.com/services/student-moves'],
    ['Storage', 'https://www.nglob.com/#how-it-works-storage'],
    ['Business solutions', 'https://www.nglob.com/business'],
  ] },
  { label: 'Company', links: [
    ['About Nglob', 'https://www.nglob.com/about'],
    ['Company details', 'https://www.nglob.com/about#company-details'],
    ['How it works', 'https://www.nglob.com/#how-it-works'],
    ['Why Nglob', 'https://www.nglob.com/#why-nglob'],
    ['Reviews', 'https://www.nglob.com/about#reviews'],
    ['Careers', 'https://www.nglob.com/about#careers'],
  ] },
  { label: 'Partners', links: [
    ['Referral partners', 'https://www.nglob.com/partner'],
    ['Service partners', 'https://www.nglob.com/service-partners'],
    ['Business partnerships', 'https://www.nglob.com/business-partnerships'],
  ] },
  { label: 'Support', links: [
    ['Help Centre', 'https://www.nglob.com/faq'],
    ['Contact Us', 'https://www.nglob.com/contact'],
  ] },
] as const;

export function SiteFooter() {
  return <footer class="site-footer">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="https://www.nglob.com/" aria-label="Nglob home"><img src={assets.logo} alt="Nglob" width={119} height={47} /></a>
        <p>Moving, delivery &amp; storage.<br />Made clear from the start.</p>
        <a href="mailto:support@nglob.com" class="footer-email">support@nglob.com</a>
      </div>
      {footerGroups.map(group => <nav class="footer-col" aria-label={group.label}>
        <h2>{group.label}</h2>
        <ul>{group.links.map(([label, href]) => <li>
          <a href={href} aria-current={label === 'Contact Us' ? 'page' : undefined}>{label}</a>
        </li>)}</ul>
      </nav>)}
    </div>
    <div class="footer-bottom">
      <p>© 2026 Nglob. All rights reserved.</p>
      <nav class="footer-legal" aria-label="Legal">
        <a href="https://www.nglob.com/privacy">Privacy Policy</a>
        <a href="https://www.nglob.com/terms">Terms &amp; Conditions</a>
        <a href="https://www.nglob.com/cookies">Cookie Policy</a>
      </nav>
    </div>
  </footer>;
}
