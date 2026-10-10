import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { TeamForm } from './ContactForms';
import { Icon } from './Icon';
import { assets } from './assets';
import type { ContactUsPageProps } from './types';
import { withRequestDeadline } from './requestDeadline';

export type ChatView = 'assistant' | 'team';
type ChatMessage = { id: number; speaker: 'You' | 'Nglob assistant'; text: string };

type ContactChatProps = Pick<ContactUsPageProps,
  'onTeamSubmit' | 'onTeamStatus' | 'onAssistantMessage' | 'requestTimeoutMs'> & {
    open: boolean;
    mobile: boolean;
    view: ChatView;
    onViewChange: (view: ChatView) => void;
    onClose: () => void;
    onPanelRef: (element: HTMLElement) => void;
    onTitleRef: (view: ChatView, element: HTMLHeadingElement) => void;
    idPrefix: string;
    showDemoNotice: boolean;
  };

export function ContactChat(props: ContactChatProps) {
  const [draft, setDraft] = createSignal('');
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [pending, setPending] = createSignal(false);
  const [notice, setNotice] = createSignal('');
  let composerRef: HTMLTextAreaElement | undefined;
  let bodyRef: HTMLDivElement | undefined;
  let request: AbortController | undefined;
  let nextMessageId = 0;
  let disposed = false;

  onCleanup(() => { disposed = true; request?.abort(); request = undefined; });
  createEffect(() => {
    const messageCount = messages().length;
    const currentNotice = notice();
    if (props.open && props.view === 'assistant' && (messageCount || currentNotice)) {
      bodyRef?.scrollTo({ top: bodyRef.scrollHeight });
    }
  });

  async function sendMessage() {
    const message = draft().trim();
    if (!message || request) return;
    const handler = props.onAssistantMessage;
    if (!handler) {
      setNotice('Design reference only. Nothing has been sent.');
      return;
    }
    const controller = new AbortController();
    request = controller;
    setPending(true);
    setNotice('');
    try {
      const reply = await withRequestDeadline(signal => handler(message, { signal }), controller, props.requestTimeoutMs);
      if (disposed || request !== controller) return;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty reply');
      setMessages(current => [...current,
        { id: nextMessageId++, speaker: 'You', text: message },
        { id: nextMessageId++, speaker: 'Nglob assistant', text: reply },
      ]);
      setDraft('');
    } catch {
      if (!disposed && request === controller) {
        setNotice('We couldn’t get a reply. Your message is still here. You can try again or message our team.');
      }
    } finally {
      if (!disposed && request === controller) {
        request = undefined;
        setPending(false);
      }
    }
  }

  return <section class="chat-panel" id={`${props.idPrefix}-chat`}
    ref={element => props.onPanelRef(element)} hidden={!props.open}
    role={props.mobile ? 'dialog' : 'region'} aria-modal={props.mobile && props.open ? true : undefined}
    aria-label={props.view === 'team' ? 'Message the Nglob team' : 'Nglob chat'}>
    <header class="chat-header">
      <div class="brand-avatar"><img src={assets.satinMark} width={107} height={88} alt="" /></div>
      <div><h2>{props.view === 'team' ? 'Nglob support' : 'Nglob assistant'}</h2><p>{props.view === 'team' ? 'Reply by email' : 'AI assistant'}</p></div>
      <button type="button" class="minimise" aria-label="Minimise chat" onClick={() => props.onClose()}><Icon name="minimise" /></button>
    </header>
    <Show when={props.showDemoNotice}><p class="chat-reference">Design reference · no messages are sent</p></Show>
    {/* Keep both branches mounted so switching views never discards a draft. */}
    <div class="chat-body" ref={bodyRef} hidden={props.view !== 'assistant'}>
      <h3 class="chat-title" tabIndex={-1} ref={element => props.onTitleRef('assistant', element)}>What can I help with?</h3>
      <p>Ask about moving, delivery, storage or getting ready for your booking.</p>
      <div class="chat-chips" role="group" aria-label="Suggested topics">
        <For each={['Choosing the right service', 'Getting ready for a move', 'Help with a booking']}>
          {topic => <button type="button" disabled={pending()} onClick={() => {
            setDraft(topic);
            setNotice('');
            composerRef?.focus();
          }}>{topic}</button>}
        </For>
      </div>
      <div class="chat-human"><p>Our team can help by email.</p>
        <button class="text-button" type="button" onClick={() => props.onViewChange('team')}>Message our team</button>
      </div>
      <Show when={messages().length > 0}>
        <div class="chat-transcript" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
          <For each={messages()}>{message => <div class={`chat-message ${message.speaker === 'You' ? 'from-client' : ''}`}>
            <p class="chat-speaker">{message.speaker}</p><p>{message.text}</p>
          </div>}</For>
        </div>
      </Show>
      <Show when={pending()}><p class="reference-inline" role="status">Waiting for a reply…</p></Show>
      <Show when={notice()}><p class="reference-inline" role="status">{notice()}</p></Show>
    </div>
    <div class="chat-body" hidden={props.view !== 'team'}>
      <button type="button" class="text-button team-back" onClick={() => props.onViewChange('assistant')}>← Switch to AI chat</button>
      <h3 class="chat-title" tabIndex={-1} ref={element => props.onTitleRef('team', element)}>Message our team</h3>
      <p>Tell us what you need help with. We’ll reply by email.</p>
      <TeamForm idPrefix={props.idPrefix} onSubmit={props.onTeamSubmit} onCheckStatus={props.onTeamStatus} requestTimeoutMs={props.requestTimeoutMs} />
    </div>
    <div class="chat-composer" hidden={props.view !== 'assistant'}>
      <p class="chat-privacy">We use your messages to handle your enquiry.<br />
        <a href="https://www.nglob.com/privacy" target="_blank" rel="noopener" aria-label="Privacy Policy, opens in a new tab">Privacy Policy</a> <span aria-hidden="true">↗</span>
      </p>
      <div class="composer-row">
        <textarea aria-label="Your message" placeholder="Type your message" rows={1} ref={composerRef}
          value={draft()} disabled={pending()} onInput={event => { setDraft(event.currentTarget.value); setNotice(''); }} />
        <button type="button" class="send-message" aria-label="Send message" disabled={pending() || !draft().trim()}
          aria-busy={pending() || undefined} onClick={() => { void sendMessage(); }}><Icon name="send" /></button>
      </div>
    </div>
  </section>;
}
