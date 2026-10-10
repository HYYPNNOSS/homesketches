import { isReferralIntent, isReferralView, referralIntent, type ReferralController, type ReferralInteractionOptions, type ReferralIntent, type ReferralView } from "./referral-types";
export type { ReferralAction, ReferralController, ReferralInteractionOptions, ReferralIntent, ReferralView } from "./referral-types";

interface PageInteractions {
  controller: ReferralController;
  resetMessages(): void;
}
const instances = new WeakMap<HTMLElement, ReferralController>();
/** Public-page interactions only: calculator, editable examples and host callbacks. */
export function createReferralInteractions(root: HTMLElement, options: ReferralInteractionOptions): PageInteractions {
  if (typeof options.onAction !== "function") throw new TypeError("ReferralPartners requires an onAction callback.");
  instances.get(root)?.destroy();
  const abort = new AbortController();
  let destroyed = false;
  const byId = <T extends HTMLElement = HTMLElement,>(id: string): T | null => root.querySelector<T>(`#${CSS.escape(id)}`);
  const query = <T extends HTMLElement = HTMLElement,>(selector: string): T | null => root.querySelector<T>(selector);
  const queryAll = <T extends HTMLElement = HTMLElement,>(selector: string): NodeListOf<T> => root.querySelectorAll<T>(selector);
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
  function open(view: ReferralView, intent?: ReferralIntent) {
    if (destroyed) return;
    if (!isReferralView(view)) throw new RangeError(`Unknown referral action: ${view}`);
    if (intent !== undefined && !isReferralIntent(intent)) throw new RangeError(`Unknown referral intent: ${intent}`);
    options.onAction({view, intent: intent ?? referralIntent(view)});
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    Object.assign(messageDrafts, messages);
    if (messageBox) messageBox.value = messages.personal;
    instances.delete(root);
  }
  // The host owns its header/footer; their controls are deliberately outside this listener.
  byId('rp')?.addEventListener('click', event => {
    const trigger = (event.target instanceof Element ? event.target : null)?.closest<HTMLElement>('[data-open]');
    if (!trigger?.dataset.open || !isReferralView(trigger.dataset.open)) return;
    event.preventDefault();
    open(trigger.dataset.open, isReferralIntent(trigger.dataset.intent) ? trigger.dataset.intent : undefined);
  }, { signal: abort.signal });
  async function copyText(input: HTMLInputElement | HTMLTextAreaElement, status: HTMLElement) {
    const copiedValue = input.value;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(copiedValue);
        copied = true;
      }
    } catch (_) {}
    if (destroyed || !input.isConnected || input.value !== copiedValue) return;
    if (copied) {
      status.textContent = 'Copied.';
    } else {
      input.focus();
      input.select();
      status.textContent = 'Text selected. Use Copy, Ctrl+C or ⌘C.';
    }
  }
  const messages: Record<string, string> = {
    personal: 'Ad · Planning a move or collecting furniture? Take a look at Nglob. You can use photos or a short video to build your item list, review it, then book directly. I may earn commission on eligible work booked through my link: [Your referral link]',
    audience: 'Ad · Moving soon, collecting furniture or looking for storage? Explore Nglob through my link. I may earn a commission on eligible bookings: [your referral link]',
    business: 'Partner introduction · Do you need moving or delivery services for your business? I can introduce you to Nglob. I may earn commission on eligible work if the introduction is approved. Let me know if you would like an introduction.'
  };
  const messageBox = byId<HTMLTextAreaElement>('share-message'),
    messageCTA = query('#share-tools .rp-message-actions [data-open]');
  if (messageBox) messages.personal = messageBox.value;
  const messageDrafts: Record<string, string> = {
    ...messages
  };
  let activeMessage = 'personal';
  function fitMessage() {
    if (destroyed || !messageBox) return;
    messageBox.style.height = 'auto';
    const style = getComputedStyle(messageBox),
      minimum = parseFloat(style.minHeight) || 0,
      borders = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    messageBox.style.height = Math.min(420, Math.max(minimum, messageBox.scrollHeight + borders)) + 'px';
    messageBox.style.overflowY = messageBox.scrollHeight > messageBox.clientHeight ? 'auto' : 'hidden';
  }
  function showMessage(type: string) {
    activeMessage = Object.hasOwn(messages, type) ? type : 'personal';
    if (messageBox) {
      messageBox.value = messageDrafts[activeMessage];
      fitMessage();
    }
    if (messageCTA) {
      const business = activeMessage === 'business';
      messageCTA.textContent = business ? 'Introduce a business' : 'Get my own link';
      messageCTA.dataset.open = business ? 'introduce' : 'join';
      messageCTA.dataset.intent = business ? 'introduce' : 'share';
    }
    queryAll<HTMLElement>('[data-message]').forEach(b => {
      const selected = b.dataset.message === activeMessage;
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    const panel = byId('message-panel');
    if (panel) panel.setAttribute('aria-labelledby', 'message-tab-' + activeMessage);
    const status = byId('copy-status');
    if (status) status.textContent = '';
  }
  function resetMessageDrafts() {
    Object.assign(messageDrafts, messages);
    showMessage('personal');
  }
  const messageTabs = Array.from(queryAll<HTMLElement>('[data-message]'));
  function selectMessageTab(tab: HTMLElement, focus: boolean) {
    if (messageBox) messageDrafts[activeMessage] = messageBox.value;
    showMessage(tab.dataset.message || "personal");
    if (focus) tab.focus();
  }
  messageTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectMessageTab(tab, false), {
      signal: abort.signal
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % messageTabs.length;else if (event.key === 'ArrowLeft') next = (index + messageTabs.length - 1) % messageTabs.length;else if (event.key === 'Home') next = 0;else if (event.key === 'End') next = messageTabs.length - 1;else return;
      event.preventDefault();
      selectMessageTab(messageTabs[next], true);
    }, {
      signal: abort.signal
    });
  });
  if (messageBox) {
    messageBox.addEventListener('input', () => {
      messageDrafts[activeMessage] = messageBox.value;
      fitMessage();
      const status = byId('copy-status');
      if (status) status.textContent = '';
    }, {
      signal: abort.signal
    });
    window.addEventListener('resize', fitMessage, {
      signal: abort.signal
    });
    fitMessage();
    if (document.fonts) document.fonts.ready.then(() => {
      if (!destroyed) fitMessage();
    });
  }
  const copyButton = byId('copy-message');
  if (copyButton) copyButton.addEventListener('click', () => {
    const status = byId('copy-status');
    if (messageBox && status) copyText(messageBox, status);
  }, {
    signal: abort.signal
  });
  const revenue = byId<HTMLInputElement>('revenue'),
    range = byId<HTMLInputElement>('revenue-range');
  function calculate(value: string, source: string) {
    const amount = Number(value),
      validAmount = value !== '' && Number.isInteger(amount) && amount >= 0 && amount <= 10000;
    const error = byId('calc-error');
    if (error) error.textContent = validAmount ? '' : 'Enter a whole-pound amount from £0 to £10,000.';
    if (revenue) revenue.setAttribute('aria-invalid', String(!validAmount));
    [6, 8, 12].forEach(rate => {
      const n = byId('commission-' + rate);
      if (n) n.textContent = validAmount ? money.format(amount * rate / 100) : '—';
    });
    if (validAmount) {
      if (source === 'range' && revenue) revenue.value = String(amount);
      if (source !== 'range' && range) range.value = String(amount);
      if (range) range.setAttribute('aria-valuetext', money.format(amount));
    }
  }
  [6, 8, 12].forEach((rate, index) => {
    const output = byId('commission-' + rate);
    if (output) {
      output.setAttribute('aria-label', ['Partner', 'Pro', 'Ambassador'][index] + ' ' + rate + '% example commission');
      output.setAttribute('for', 'revenue revenue-range');
    }
  });
  if (revenue) {
    revenue.step = '1';
    revenue.inputMode = 'numeric';
    revenue.addEventListener('input', () => calculate(revenue.value, 'number'), {
      signal: abort.signal
    });
    calculate(revenue.value, 'number');
  }
  if (range) {
    range.step = '1';
    range.addEventListener('input', () => calculate(range.value, 'range'), {
      signal: abort.signal
    });
  }
  const controller: ReferralController = Object.freeze({ open, destroy });
  instances.set(root, controller);
  return { controller, resetMessages: resetMessageDrafts };
}
