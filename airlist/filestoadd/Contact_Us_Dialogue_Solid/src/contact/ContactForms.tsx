import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { Icon } from './Icon';
import type { CallbackRequest, StatusHandler, SubmissionHandler, TeamMessage } from './types';
import { createSubmission, DEMO_NOTICE } from './createSubmission';
import type { SubmissionState } from './createSubmission';

interface FormProps<T> {
  idPrefix: string;
  onSubmit?: SubmissionHandler<T>;
  onCheckStatus?: StatusHandler;
  requestTimeoutMs?: number;
}

type FieldControl = HTMLInputElement | HTMLTextAreaElement;

function PrivacyLink() {
  return <><a href="https://www.nglob.com/privacy" target="_blank" rel="noopener" aria-label="Privacy Policy, opens in a new tab">Privacy Policy</a> <span aria-hidden="true">↗</span></>;
}

function Field(props: {
  id: string;
  label: JSX.Element;
  note: string;
  error?: string;
  children: JSX.Element;
}) {
  return <div class={`field${props.error ? ' has-error' : ''}`}>
    <label for={props.id}>{props.label}</label>
    {props.children}
    <p id={`${props.id}-note`} class={`field-note${props.error ? ' error' : ''}`}>{props.error || props.note}</p>
  </div>;
}

function FormOutcome(props: {
  kind: 'callback' | 'team';
  state: SubmissionState;
  retry: () => void;
  checkStatus: () => Promise<void>;
  canCheckStatus: boolean;
}) {
  let heading: HTMLHeadingElement | undefined;
  let disposed = false;
  let focusVersion = 0;
  onCleanup(() => { disposed = true; });
  const callback = () => props.kind === 'callback';
  const status = () => props.state.status;
  const visible = () => status() !== 'idle' && status() !== 'demo';
  const title = () => {
    const current = props.state;
    if (current.status === 'pending') return current.checking ? 'Checking receipt…' : callback() ? 'Sending your request…' : 'Sending your message…';
    if (current.status === 'received') return callback() ? 'Callback request received' : 'Message received';
    if (current.status === 'rejected') return callback() ? 'Your request wasn’t received' : 'Your message wasn’t received';
    return 'We couldn’t confirm receipt';
  };
  const description = () => {
    if (status() === 'pending') return 'Please wait while we confirm receipt.';
    if (status() === 'received') return callback() ? 'We’ve received your request. A callback time has not been confirmed.' : 'We’ll reply to the email address you provided.';
    if (status() === 'rejected') return 'Please try again.';
    return props.canCheckStatus
      ? `Check the status of this ${callback() ? 'request' : 'message'} before sending another one.`
      : 'Email our team to check whether it arrived before sending another one.';
  };

  createEffect(() => {
    // Wait for Solid's DOM updates, then focus only the latest visible outcome.
    const currentStatus = status();
    const version = ++focusVersion;
    if (currentStatus === 'idle' || currentStatus === 'demo') return;
    queueMicrotask(() => {
      if (!disposed && version === focusVersion && heading?.isConnected && heading.getClientRects().length) {
        heading.focus({ preventScroll: true });
      }
    });
  });

  return <Show when={visible()}>
    <div class={`form-outcome${status() === 'pending' ? ' sending' : status() === 'received' ? ' success' : status() === 'rejected' ? ' error' : ''}`} role="status" aria-live="polite">
      <Icon name={status() === 'received' ? 'check' : status() === 'rejected' ? 'warning' : 'clock'} /><div>
        <h3 ref={heading} tabindex={-1}>{title()}</h3><p>{description()}</p>
        <Show when={status() === 'pending'}>
          <button class="button" type="button" disabled aria-busy="true" style={{ 'margin-top': '16px' }}>{title()}<span class="spinner" aria-hidden="true" /></button>
        </Show>
        <Show when={status() === 'rejected'}>
          <button class="text-button" type="button" onClick={props.retry}>Try again</button>
        </Show>
        <Show when={status() === 'unknown' && props.canCheckStatus}>
          <button class="text-button" type="button" onClick={() => void props.checkStatus()}>Check {callback() ? 'request' : 'message'} status</button>
        </Show>
        <Show when={status() === 'unknown' && !props.canCheckStatus}>
          <a class="text-button" href="mailto:support@nglob.com">Email our team</a>
        </Show>
      </div>
    </div>
  </Show>;
}

interface CallbackValues { phone: string; message: string; reference: string; preferred: string }

export function CallbackForm(props: FormProps<CallbackRequest>) {
  const [values, setValues] = createSignal<CallbackValues>({ phone: '', message: '', reference: '', preferred: '' });
  const [errors, setErrors] = createSignal<Partial<Record<keyof CallbackValues, string>>>({});
  const controls: Partial<Record<keyof CallbackValues, FieldControl>> = {};
  const submission = createSubmission(() => props.onSubmit, () => props.onCheckStatus, () => props.requestTimeoutMs);
  const editable = () => submission.state().status === 'idle' || submission.state().status === 'demo';
  const id = (name: string) => `${props.idPrefix}-${name}`;
  let disposed = false;
  onCleanup(() => { disposed = true; });

  function update(name: keyof CallbackValues, value: string) {
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    submission.clearDemoNotice();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!editable()) return;
    const current = values();
    const next: Partial<Record<keyof CallbackValues, string>> = {};
    const phone = current.phone.trim();
    const digits = phone.replace(/\D/g, '');
    if (!phone) next.phone = 'Enter your phone number.';
    else if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) next.phone = 'Enter a valid phone number. Include the country code if outside the UK.';
    if (!current.message.trim()) next.message = 'Tell us what you need help with.';
    else if (current.message.trim().length > 1000) next.message = 'Use 1,000 characters or fewer.';
    setErrors(next);
    const first = (['phone', 'message'] as const).find(name => next[name]);
    if (first) { controls[first]?.focus(); return; }
    void submission.submit({ phone, message: current.message.trim(), bookingReference: current.reference.trim() || undefined, preferredTime: current.preferred.trim() || undefined });
  }

  function retry() {
    submission.retry();
    queueMicrotask(() => {
      if (!disposed && controls.phone?.isConnected && controls.phone.getClientRects().length) controls.phone.focus({ preventScroll: true });
    });
  }

  return <>
    {/* Keep the form mounted so drafts, selection, and field identities survive outcomes. */}
    <form class="callback-form" novalidate onSubmit={handleSubmit} hidden={!editable()}>
      <p class="form-caption">Tell us what you need help with and the number to call.</p>
      <div class="form-grid">
        <Field id={id('phone')} label="Phone number" note="Outside the UK? Include your country code." error={errors().phone}>
          <input ref={element => { controls.phone = element; }} id={id('phone')} name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+44" aria-describedby={`${id('phone')}-note`} aria-invalid={errors().phone ? true : undefined} value={values().phone} onInput={event => update('phone', event.currentTarget.value)} />
        </Field>
        <Field id={id('message')} label="What can we help with?" note="Up to 1,000 characters." error={errors().message}>
          <textarea ref={element => { controls.message = element; }} id={id('message')} name="message" maxlength={1000} rows={3} required placeholder="Tell us a little about your question." aria-describedby={`${id('message')}-note`} aria-invalid={errors().message ? true : undefined} value={values().message} onInput={event => update('message', event.currentTarget.value)} />
        </Field>
        <Field id={id('reference')} label={<>Booking reference <span class="optional">(optional)</span></>} note="For questions about an existing booking.">
          <input id={id('reference')} name="reference" type="text" placeholder="" aria-describedby={`${id('reference')}-note`} value={values().reference} onInput={event => update('reference', event.currentTarget.value)} />
        </Field>
        <Field id={id('preferred')} label={<>Best time to call (UK time) <span class="optional">(optional)</span></>} note="This is a preference, not a confirmed appointment.">
          <input id={id('preferred')} name="preferred" type="text" placeholder="For example, weekday afternoons" aria-describedby={`${id('preferred')}-note`} value={values().preferred} onInput={event => update('preferred', event.currentTarget.value)} />
        </Field>
      </div>
      <p class="privacy-note">We use these details to handle your callback request.<br /><PrivacyLink /></p>
      <button class="button" type="submit">Send callback request<Icon name="arrow" /></button>
      <Show when={submission.state().status === 'demo'}><p class="reference-inline" role="status">{DEMO_NOTICE}</p></Show>
    </form>
    <FormOutcome kind="callback" state={submission.state()} retry={retry} checkStatus={submission.checkStatus} canCheckStatus={submission.canCheckStatus()} />
  </>;
}

interface TeamValues { email: string; message: string }

export function TeamForm(props: FormProps<TeamMessage>) {
  const [values, setValues] = createSignal<TeamValues>({ email: '', message: '' });
  const [errors, setErrors] = createSignal<Partial<Record<keyof TeamValues, string>>>({});
  const controls: Partial<Record<keyof TeamValues, FieldControl>> = {};
  const submission = createSubmission(() => props.onSubmit, () => props.onCheckStatus, () => props.requestTimeoutMs);
  const editable = () => submission.state().status === 'idle' || submission.state().status === 'demo';
  const id = (name: string) => `${props.idPrefix}-${name}`;
  let disposed = false;
  onCleanup(() => { disposed = true; });

  function update(name: keyof TeamValues, value: string) {
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    submission.clearDemoNotice();
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!editable()) return;
    const current = values();
    const next: Partial<Record<keyof TeamValues, string>> = {};
    if (!current.email.trim() || (controls.email as HTMLInputElement | undefined)?.validity.typeMismatch) next.email = 'Enter a valid email address.';
    else if (current.email.trim().length > 254) next.email = 'Use 254 characters or fewer.';
    if (!current.message.trim()) next.message = 'Enter your message.';
    else if (current.message.trim().length > 1000) next.message = 'Use 1,000 characters or fewer.';
    setErrors(next);
    const first = (['email', 'message'] as const).find(name => next[name]);
    if (first) { controls[first]?.focus(); return; }
    void submission.submit({ email: current.email.trim(), message: current.message.trim() });
  }

  function retry() {
    submission.retry();
    queueMicrotask(() => {
      if (!disposed && controls.email?.isConnected && controls.email.getClientRects().length) controls.email.focus({ preventScroll: true });
    });
  }

  return <>
    <form class="team-form" novalidate onSubmit={handleSubmit} hidden={!editable()}>
      <Field id={id('reply-email')} label="Your email" note="Where you’d like to receive our reply." error={errors().email}>
        <input ref={element => { controls.email = element; }} id={id('reply-email')} name="reply-email" type="email" autocomplete="email" maxlength={254} aria-describedby={`${id('reply-email')}-note`} aria-invalid={errors().email ? true : undefined} required placeholder="" value={values().email} onInput={event => update('email', event.currentTarget.value)} />
      </Field>
      <Field id={id('team-message')} label="Your message" note="Include your booking reference if you have one. Up to 1,000 characters." error={errors().message}>
        <textarea ref={element => { controls.message = element; }} id={id('team-message')} name="team-message" maxlength={1000} rows={3} required placeholder="" aria-describedby={`${id('team-message')}-note`} aria-invalid={errors().message ? true : undefined} value={values().message} onInput={event => update('message', event.currentTarget.value)} />
      </Field>
      <p class="privacy-note">We use these details to respond to your enquiry.<br /><PrivacyLink /></p>
      <button class="button" type="submit">Send message<Icon name="arrow" /></button>
      <Show when={submission.state().status === 'demo'}><p class="reference-inline" role="status">{DEMO_NOTICE}</p></Show>
    </form>
    <FormOutcome kind="team" state={submission.state()} retry={retry} checkStatus={submission.checkStatus} canCheckStatus={submission.canCheckStatus()} />
  </>;
}
