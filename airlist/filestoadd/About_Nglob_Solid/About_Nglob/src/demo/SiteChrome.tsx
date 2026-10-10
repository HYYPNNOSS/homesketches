import { For } from "solid-js";
import type { ParentProps } from "solid-js";

const navigation = [
  ["Personal", "https://www.nglob.com/"],
  ["Business", "https://www.nglob.com/business"],
  ["Storage", "https://www.nglob.com/#how-it-works-storage"],
  ["Partners", "https://www.nglob.com/partner"],
] as const;

const footerGroups = [
  { label: "Services", links: [
    ["Home Moving", "https://www.nglob.com/services/home-relocation"],
    ["Few Items", "https://www.nglob.com/services/few-items"],
    ["Student Moving", "https://www.nglob.com/services/student-moves"],
    ["Storage", "https://www.nglob.com/#how-it-works-storage"],
    ["Business Solutions", "https://www.nglob.com/business"],
  ] },
  { label: "Company", links: [
    ["About Nglob", "/about"],
    ["How it works", "https://www.nglob.com/how-it-works"],
  ] },
  { label: "Partners", links: [
    ["Referral Partners", "https://www.nglob.com/partner"],
    ["Service Partners", "https://www.nglob.com/service-partners"],
  ] },
  { label: "Support", links: [
    ["Help Centre", "https://www.nglob.com/faq"],
    ["Contact Us", "https://www.nglob.com/contact"],
  ] },
] as const;

const socialLinks = [
  ["Instagram", "https://instagram.com"],
  ["TikTok", "https://tiktok.com"],
  ["YouTube", "https://youtube.com"],
  ["LinkedIn", "https://linkedin.com"],
  ["Facebook", "https://facebook.com"],
  ["X", "https://x.com"],
] as const;

export function SiteChrome(props: ParentProps) {
  let menu: HTMLDetailsElement | undefined;
  let menuTrigger: HTMLElement | undefined;

  function closeMenu(restoreFocus = false) {
    if (menu) menu.open = false;
    if (restoreFocus) menuTrigger?.focus();
  }

  return <div class="nglob-about-shell">
    <a class="na-shell-skip" href="#main">Skip to content</a>
    <header class="na-shell-header">
      <div class="na-shell-header-inner">
        <a class="na-shell-logo" href="https://www.nglob.com/" aria-label="Nglob home">
          <img src="/nglob-about/assets/nglob-logo.png" alt="Nglob" width="110" height="28" />
        </a>
        <nav class="na-shell-nav" aria-label="Main navigation">
          <For each={navigation}>{([label, href]) => <a href={href}>{label}</a>}</For>
        </nav>
        <div class="na-shell-actions">
          <a class="na-shell-login" href="https://www.nglob.com/?login=true">Log in</a>
          <a class="na-shell-quote" href="https://app.nglob.com/">Get my price</a>
          <details class="na-shell-menu" ref={menu} onKeyDown={(event) => {
            if (event.key === "Escape" && menu?.open) { event.preventDefault(); closeMenu(true); }
          }}>
            <summary aria-label="Main menu" ref={menuTrigger}><span></span><span></span></summary>
            <nav aria-label="Mobile navigation" onClick={(event) => {
              if ((event.target as Element).closest("a")) closeMenu();
            }}>
              <For each={navigation}>{([label, href]) => <a href={href}>{label}</a>}</For>
              <a href="https://www.nglob.com/?login=true">Log in</a>
            </nav>
          </details>
        </div>
      </div>
    </header>
    {props.children}
    <footer class="na-shell-footer">
      <div class="na-shell-footer-inner">
      <div class="na-shell-footer-top">
        <div class="na-shell-footer-brand">
          <a href="https://www.nglob.com/" aria-label="Nglob home"><img src="/nglob-about/assets/nglob-logo.png" alt="Nglob" width="110" height="28" loading="lazy" /></a>
          <p class="na-shell-tagline">Moving, delivery &amp; storage—<br />made clear from the start.</p>
          <div class="na-shell-privacy-card">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <div>
              <p class="na-shell-card-title">Secure &amp; private</p>
              <p>Your details stay protected.<br />You stay in control.</p>
            </div>
          </div>
        </div>
        <div class="na-shell-footer-groups">
          <For each={footerGroups}>{(group) => <nav class="na-shell-footer-col" aria-label={group.label}>
            <h2>{group.label}</h2>
            <ul><For each={group.links}>{([label, href]) => <li>
              <a href={href} aria-current={label === "About Nglob" ? "page" : undefined}>
                <span>{label}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </a>
            </li>}</For></ul>
          </nav>}</For>
        </div>
        <div class="na-shell-email-card">
          <div class="na-shell-email-heading">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            <p class="na-shell-card-title">Email us</p>
          </div>
          <a href="mailto:support@nglob.com">support@nglob.com</a>
          <p class="na-shell-email-note">Replies every day</p>
        </div>
      </div>
      <div class="na-shell-footer-middle">
        <div class="na-shell-social">
          <span class="na-shell-footer-label">Follow</span>
          <nav class="na-shell-social-links" aria-label="Follow Nglob">
            <For each={socialLinks}>{([label, href]) => <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>}</For>
          </nav>
        </div>
        <div class="na-shell-payments">
          <span class="na-shell-footer-label">Secure Payments</span>
          <div class="na-shell-payment-badges" role="group" aria-label="Payment methods">
            <span class="na-shell-payment-visa" role="img" aria-label="Visa">VISA</span>
            <span class="na-shell-payment-mc" role="img" aria-label="Mastercard">MC</span>
            <span class="na-shell-payment-amex" role="img" aria-label="American Express">AMEX</span>
            <span class="na-shell-payment-pay" role="img" aria-label="Pay">Pay</span>
            <span class="na-shell-payment-pay" role="img" aria-label="Google Pay">G Pay</span>
          </div>
        </div>
      </div>
      <div class="na-shell-footer-bottom">
        <p>© 2026 Nglob. All rights reserved.</p>
        <nav aria-label="Legal">
          <a href="https://www.nglob.com/privacy">Privacy Policy</a>
          <a href="https://www.nglob.com/terms">Terms &amp; Conditions</a>
          <a href="https://www.nglob.com/cookies">Cookie Policy</a>
        </nav>
        <p class="na-shell-trustline">Clear pricing • Approved teams • Live tracking</p>
      </div>
      </div>
    </footer>
  </div>;
}
