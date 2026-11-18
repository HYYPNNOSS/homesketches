import { batch, createEffect, createSignal, createUniqueId, on, onCleanup, onMount, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { CallbackForm } from './ContactForms';
import { ContactChat } from './ContactChat';
import type { ChatView } from './ContactChat';
import { SiteFooter, SiteHeader } from './SiteChrome';
import { Icon } from './Icon';
import { assets } from './assets';
import type { ContactUsPageProps } from './types';
import './ContactUsPage.css';

/** Native Solid component for the approved Dialogue page. */
export default function ContactUsPage(props: ContactUsPageProps) {
  const idPrefix = `nglob-${createUniqueId()}`;
  const [callbackOpen, setCallbackOpen] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [chatOpen, setChatOpen] = createSignal(false);
  const [chatView, setChatView] = createSignal<ChatView>('assistant');
  const [mobile, setMobile] = createSignal(false);
  const [belowContact, setBelowContact] = createSignal(false);
  let hubRef: HTMLDivElement | undefined;
  let scrollRef: HTMLDivElement | undefined;
  let menuRef: HTMLButtonElement | undefined;
  let panelRef: HTMLElement | undefined;
  const titles: Partial<Record<ChatView, HTMLHeadingElement>> = {};
  let triggerRef: HTMLButtonElement | undefined;
  let chatWasOpen = false;
  let disposed = false;
  let focusFrame = 0;

  onMount(() => {
    const media = window.matchMedia('(max-width: 759px)');
    const update = () => batch(() => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); });
    update();
    media.addEventListener('change', update);
    onCleanup(() => media.removeEventListener('change', update));
  });

  onMount(() => {
    let frame = 0;
    const update = () => { frame = 0; if (hubRef) setBelowContact(hubRef.getBoundingClientRect().bottom <= 0); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const region = scrollRef;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    region?.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    if (hubRef) observer.observe(hubRef);
    update();
    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      region?.removeEventListener('scroll', schedule);
    });
  });

  createEffect(on([chatOpen, chatView, mobile], ([open, view]) => {
    const restore = !open && chatWasOpen;
    chatWasOpen = open;
    // Let hidden/inert bindings settle before moving focus.
    queueMicrotask(() => {
      if (disposed || open !== chatOpen() || view !== chatView()) return;
      if (open) titles[view]?.focus({ preventScroll: true });
      else if (restore) triggerRef?.focus({ preventScroll: true });
    });
  }));

  onCleanup(() => {
    disposed = true;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(focusFrame);
  });

  function openChat(trigger: HTMLButtonElement, view = chatView()) {
    triggerRef = trigger;
    const alreadyOpen = chatOpen() && view === chatView();
    batch(() => { setChatView(view); setChatOpen(true); });
    if (alreadyOpen) titles[view]?.focus({ preventScroll: true });
  }

  const handleKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = event => {
    if (event.key === 'Escape') {
      if (chatOpen()) { event.preventDefault(); setChatOpen(false); }
      else if (menuOpen()) { setMenuOpen(false); menuRef?.focus(); }
    }
    if (event.key !== 'Tab' || !chatOpen() || !mobile() || !panelRef) return;
    const controls = Array.from(panelRef.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled)'))
      .filter(element => element.getClientRects().length > 0 && !element.closest('[hidden]'));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === titles[chatView()] || !panelRef.contains(document.activeElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panelRef.contains(document.activeElement))) {
      event.preventDefault(); first?.focus();
    }
  };

  const keepFocusedControlVisible: JSX.EventHandler<HTMLDivElement, FocusEvent> = event => {
    const target = event.target;
    if (!mobile() || !(target instanceof HTMLElement) || !target.matches('a,button,input,textarea') || !target.closest('.contact-page')) return;
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      if (document.activeElement !== target || !scrollRef) return;
      const control = target.getBoundingClientRect(), region = scrollRef.getBoundingClientRect();
      if (control.top < region.top + 12 || control.bottom > region.bottom - 12) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  };

  return <div class={`nglob-contact${chatOpen() ? ' has-chat' : ''}${props.className ? ` ${props.className}` : ''}`} onKeyDown={handleKeyDown}>
    <div class={`app-shell${callbackOpen() ? ' callback-open' : ''}${belowContact() ? ' is-below-contact' : ''}`} inert={chatOpen() && mobile()}>
      <a href={`#${idPrefix}-main`} class="skip">Skip to content</a>
      <Show when={props.showDemoNotice ?? true}><div class="reference-note">Design reference · no messages or requests are sent</div></Show>
      <div class="scroll-region" ref={element => { scrollRef = element; }} onFocusIn={keepFocusedControlVisible}>
        <SiteHeader menuOpen={menuOpen()} onMenuToggle={() => setMenuOpen(open => !open)} menuId={`${idPrefix}-menu`} menuRef={element => { menuRef = element; }} />
        <main class="page contact-page" id={`${idPrefix}-main`}>
          <section class="contact-hero" aria-labelledby={`${idPrefix}-heading`}>
            <div class="hero-copy">
              <p class="page-label">Contact us</p>
              <h1 id={`${idPrefix}-heading`}>Let’s talk.</h1>
              <p class="hero-lead">Questions about moving, delivery, storage or your booking? We’re here to help.</p>
              <button type="button" class="button chat-start" aria-controls={`${idPrefix}-chat`}
                aria-expanded={chatOpen() && chatView() === 'assistant'} onClick={event => openChat(event.currentTarget, 'assistant')}>
                Chat with our AI assistant<Icon name="arrow" />
              </button>
              <div class="team-entry">
                <button class="team-direct" type="button" aria-describedby={`${idPrefix}-reply-note`}
                  aria-controls={`${idPrefix}-chat`} aria-expanded={chatOpen() && chatView() === 'team'}
                  onClick={event => openChat(event.currentTarget, 'team')}>Message our team<Icon name="arrow" /></button>
                <span id={`${idPrefix}-reply-note`}>Reply by email</span>
              </div>
            </div>
            <div class="connection-scene" aria-hidden="true">
              <div class="scene-halo" />
              <div class="brand-depth">{Array.from({ length: 30 }, () => <span class="depth-mark" />)}</div>
              <img class="moving-art" src={assets.dialogue} alt="" width={1536} height={1024} fetchpriority="high" />
            </div>
          </section>
          <div class="contact-hub" ref={element => { hubRef = element; }}>
            <div class="contact-band">
              <section class="contact-email" aria-labelledby={`${idPrefix}-email-title`}>
                <h2 id={`${idPrefix}-email-title`}>Email us directly</h2>
                <a href="mailto:support@nglob.com" class="email-address">support@nglob.com<Icon name="arrow" /></a>
                <p>Include your booking reference if you have one.</p>
                <span class="mail-app-note">Opens your email app.</span>
              </section>
              <section class={`callback${callbackOpen() ? ' is-open' : ''}`} aria-labelledby={`${idPrefix}-callback-title`}>
                <div class="callback-head">
                  <h2 id={`${idPrefix}-callback-title`}>Prefer a call?</h2>
                  <button type="button" class="callback-toggle" aria-expanded={callbackOpen()}
                    aria-controls={`${idPrefix}-callback`} onClick={() => setCallbackOpen(open => !open)}>
                    <span>{callbackOpen() ? 'Hide callback form' : 'Request a callback'}</span><Icon name="chevron" />
                  </button>
                  <p>Leave your number and tell us how we can help.</p>
                </div>
              </section>
            </div>
            <div id={`${idPrefix}-callback`} class="callback-expansion" role="region" aria-labelledby={`${idPrefix}-callback-title`} hidden={!callbackOpen()}>
              <CallbackForm requestTimeoutMs={props.requestTimeoutMs} idPrefix={idPrefix} onSubmit={props.onCallbackSubmit} onCheckStatus={props.onCallbackStatus} />
            </div>
          </div>
          <div class="contact-help"><span>Looking for answers?</span>
            <a href="https://www.nglob.com/faq">Visit our Help Centre<Icon name="arrow" /></a>
          </div>
        </main>
        <SiteFooter />
      </div>
      <div class="chat-dock">
        <button type="button" class="launcher" aria-label="Open Nglob chat" aria-expanded={chatOpen()}
          aria-controls={`${idPrefix}-chat`} onClick={event => openChat(event.currentTarget)}><Icon name="chat" /><span>Chat</span></button>
      </div>
    </div>
    <ContactChat requestTimeoutMs={props.requestTimeoutMs} open={chatOpen()} mobile={mobile()} view={chatView()} onViewChange={setChatView} onClose={() => setChatOpen(false)}
      onPanelRef={element => { panelRef = element; }} onTitleRef={(view, element) => { titles[view] = element; }} idPrefix={idPrefix} showDemoNotice={props.showDemoNotice ?? true}
      onTeamSubmit={props.onTeamSubmit} onTeamStatus={props.onTeamStatus} onAssistantMessage={props.onAssistantMessage} />
  </div>;
}
