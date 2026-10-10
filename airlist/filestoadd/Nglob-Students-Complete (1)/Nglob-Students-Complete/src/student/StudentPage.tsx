import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { Modal } from './Modal';
import { VerificationDialog } from './VerificationDialog';
import { ReferralSplit } from './ReferralSplit';
import { readReferralTerms } from './referral-config';
import { checklists, copyChecklistText, faqs, infoDialogs } from './content';
import type { DialogKey, StudentPageProps } from './types';
import './student.css';

/** One main landmark. Render inside the site's existing header/footer using SSR or prerendering. */
export function StudentPage(props: StudentPageProps) {
  const [ready, setReady] = createSignal(false);
  const [activeDialog, setActiveDialog] = createSignal<DialogKey | null>(null);
  const [verificationOpen, setVerificationOpen] = createSignal(false);
  const [copyMessage, setCopyMessage] = createSignal('');
  const [copyFallback, setCopyFallback] = createSignal(false);
  const confirmedReferralTerms = createMemo(() => readReferralTerms(props.referral));
  const asset = (name: string) =>
    `${(props.assetBase ?? '/nglob-students/assets').replace(/\/$/, '')}/${name}`;
  const open = (key: DialogKey) => setActiveDialog(key);
  const openVerification = () => {
    setActiveDialog(null);
    setVerificationOpen(true);
  };
  onMount(() => setReady(true));

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(copyChecklistText());
      setCopyMessage('Checklist copied.');
      setCopyFallback(false);
    } catch {
      setCopyMessage('Select and copy the checklist below.');
      setCopyFallback(true);
    }
  };

  return (
    <main id="main" class="ngs">
      <section class="ngs-hero ngs-wrap" aria-labelledby="ngs-heading">
        <div class="ngs-hero-copy">
          <p class="ngs-eyebrow">NGLOB FOR STUDENTS</p>
          <h1 id="ngs-heading">
            Student moving.
            <br />
            <span>Made lighter.</span>
          </h1>
          <p class="ngs-lead">
            A few boxes or your whole room.
            <br />A little help getting them there.
          </p>
          <p class="ngs-hero-description">
            Choose the help you need and review your quote before booking. Moving between terms?
            Your storage can be part of the plan.
          </p>
          <div class="ngs-actions">
            <a class="ngs-button ngs-button-primary" href={props.links.quote}>
              Get my moving quote
            </a>
            <a class="ngs-link" href="#ngs-student-status">
              See student benefits
            </a>
          </div>
        </div>
        <figure class="ngs-hero-figure">
          <img
            src={asset('student-hero-1280.webp')}
            srcset={`${asset('student-hero-640.webp')} 640w, ${asset('student-hero-1280.webp')} 1280w`}
            sizes="(max-width: 700px) calc(100vw - 64px), (max-width: 1400px) 46vw, 600px"
            width="1280"
            height="853"
            fetchpriority="high"
            decoding="async"
            alt="Three students arriving at their new home with a box, a suitcase and a plant."
          />
          <figcaption>
            <span aria-hidden="true">✳</span>
            <span>
              New keys.
              <br />
              <strong>Same favourite things.</strong>
            </span>
          </figcaption>
        </figure>
      </section>

      <nav class="ngs-quickfacts ngs-wrap" aria-label="Find what matters for your move">
        <a href="#ngs-your-move">
          <span class="ngs-fact-symbol" aria-hidden="true">
            +
          </span>
          <div>
            <strong>Just a few things?</strong>
            <span>Small moves welcome.</span>
          </div>
        </a>
        <a href="#ngs-how">
          <span class="ngs-fact-symbol" aria-hidden="true">
            £
          </span>
          <div>
            <strong>What will it cost?</strong>
            <span>See what shapes your quote.</span>
          </div>
        </a>
        <a href="#ngs-how">
          <span class="ngs-fact-symbol" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Need a hand?</strong>
            <span>Choose the help you need.</span>
          </div>
        </a>
        <a href="#ngs-storage">
          <span class="ngs-fact-symbol" aria-hidden="true">
            ◷
          </span>
          <div>
            <strong>Between homes?</strong>
            <span>Explore summer storage.</span>
          </div>
        </a>
      </nav>

      <section
        id="ngs-your-move"
        class="ngs-section ngs-wrap"
        aria-labelledby="ngs-scenarios-title"
      >
        <div class="ngs-section-head">
          <div>
            <p class="ngs-eyebrow">YOUR LIFE. YOUR KIND OF MOVE.</p>
            <h2 id="ngs-scenarios-title">Where are you off to?</h2>
          </div>
          <p>Start with what’s coming with you.</p>
        </div>
        <div class="ngs-scenarios">
          <article class="ngs-scenario ngs-lilac">
            <span class="ngs-scenario-tag">FIRST ROOM</span>
            <h3>
              Halls,
              <br /> here I come.
            </h3>
            <p>
              Boxes, bedding, books.
              <br />
              The mug you won’t share.
            </p>
            <button
              type="button"
              class="ngs-card-action"
              disabled={!ready()}
              onClick={() => open('halls')}
            >
              <span>Plan a small move</span>
              <b aria-hidden="true">+</b>
            </button>
          </article>
          <article class="ngs-scenario ngs-blue">
            <span class="ngs-scenario-tag">NEW HOUSEMATES</span>
            <h3>
              Same friends.
              <br /> New address.
            </h3>
            <p>
              Your desk, your chair,
              <br />
              your corner of the flat.
            </p>
            <button
              type="button"
              class="ngs-card-action"
              disabled={!ready()}
              onClick={() => open('flatshare')}
            >
              <span>Move a room or flat</span>
              <b aria-hidden="true">+</b>
            </button>
          </article>
          <article class="ngs-scenario ngs-peach">
            <span class="ngs-scenario-tag">BETWEEN TERMS</span>
            <h3>
              Term’s over.
              <br /> Travel light.
            </h3>
            <p>
              Head home. Move on.
              <br />
              Give your things a plan.
            </p>
            <button
              type="button"
              class="ngs-card-action"
              disabled={!ready()}
              onClick={() => open('summer')}
            >
              <span>Explore summer plans</span>
              <b aria-hidden="true">+</b>
            </button>
          </article>
        </div>
      </section>

      <section id="ngs-how" class="ngs-plan ngs-wrap" aria-labelledby="ngs-plan-title">
        <div class="ngs-plan-top">
          <div>
            <p class="ngs-eyebrow">A CLEARER PLAN FROM THE START</p>
            <h2 id="ngs-plan-title">
              Your things.
              <br />
              Your help. Your quote.
            </h2>
          </div>
          <div class="ngs-example">
            <span class="ngs-example-label">A USEFUL STARTING POINT</span>
            <p>
              <strong>4 boxes. 2 suitcases. A desk.</strong>
              <br />
              More useful than “one room”. Include sizes and anything that needs extra care.
            </p>
          </div>
        </div>
        <ol class="ngs-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Show what’s coming.</h3>
              <p>
                List your items. Photo Scan can help you start; check the result and add anything
                missed.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Choose your help.</h3>
              <p>Add your addresses and date. Say what needs carrying, packing or taking apart.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Review your quote.</h3>
              <p>Check the estimated total and selected services before you book.</p>
            </div>
          </li>
        </ol>
        <div class="ngs-price-bar">
          <div>
            <strong>What shapes the price?</strong>
            <p>
              Items & size <span aria-hidden="true">·</span> Route & date{' '}
              <span aria-hidden="true">·</span> Stairs & access <span aria-hidden="true">·</span>{' '}
              Chosen help
            </p>
          </div>
          <button
            type="button"
            class="ngs-link"
            disabled={!ready()}
            onClick={() => open('pricing')}
          >
            See the details
          </button>
        </div>
        <p class="ngs-caption ngs-plan-note">
          Packing, materials and furniture work are optional. Check that the help you need appears
          in your agreed quote.
        </p>
      </section>

      <section id="ngs-storage" class="ngs-storage ngs-wrap" aria-labelledby="ngs-storage-title">
        <figure>
          <img
            src={asset('student-summer-1280.webp')}
            srcset={`${asset('student-summer-640.webp')} 640w, ${asset('student-summer-1280.webp')} 1280w`}
            sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1150px) calc(100vw - 64px), (max-width: 1400px) 46vw, 620px"
            width="1280"
            height="853"
            loading="lazy"
            decoding="async"
            alt="Two students packing bedding and bags before leaving their room for summer."
          />
        </figure>
        <div class="ngs-storage-copy">
          <p class="ngs-eyebrow">STUDENT STORAGE BETWEEN TERMS</p>
          <h2 id="ngs-storage-title">
            You take a break.
            <br />
            <span>Your things stay.</span>
          </h2>
          <p>A gap between moving out and getting your next keys? Explore summer storage.</p>
          <ol class="ngs-storage-steps">
            <li>
              <b>1</b> Collect
            </li>
            <li>
              <b>2</b> Store
            </li>
            <li>
              <b>3</b> Return
            </li>
          </ol>
          <p class="ngs-caption">
            Check all three parts in your quote. A new return address can change the price.
          </p>
          <button
            type="button"
            class="ngs-button ngs-button-ink"
            disabled={!ready()}
            onClick={() => open('storage')}
          >
            Plan my summer storage
          </button>
        </div>
      </section>

      <section id="ngs-student-status" class="ngs-verify" aria-labelledby="ngs-verify-title">
        <div class="ngs-wrap ngs-verify-grid">
          <div class="ngs-pass-art" aria-hidden="true">
            <div class="ngs-orbit"></div>
            <div class="ngs-student-card">
              <div class="ngs-pass-top">
                <span>STUDENT STATUS</span>
                <span>✳</span>
              </div>
              <div>
                <p>Made for student life.</p>
                <strong>
                  Your next
                  <br />
                  chapter.
                </strong>
              </div>
              <div class="ngs-pass-bottom">
                <span>
                  ONE DOCUMENT
                  <br />
                  TO START
                </span>
                <span>≡</span>
              </div>
            </div>
            <div class="ngs-proof-tag">
              <span>✓</span> Name · Institution · Current studies
            </div>
          </div>
          <div class="ngs-verify-copy">
            <p class="ngs-eyebrow">STUDENT BENEFITS. A SIMPLE START.</p>
            <h2 id="ngs-verify-title">
              One document.
              <br />
              That’s the list.
            </h2>
            <p>
              {props.studentOffer?.trim() ||
                'Check your student status, then review the offer available to you before booking.'}
            </p>
            <p class="ngs-verify-description">
              Use any one document showing your name, institution and current studies. A student
              card, enrolment letter or student-portal screenshot can work.
            </p>
            <div class="ngs-actions">
              <button
                type="button"
                class="ngs-button ngs-button-lime"
                disabled={!ready()}
                onClick={openVerification}
              >
                Check my student status
              </button>
              <button
                type="button"
                class="ngs-link"
                disabled={!ready()}
                onClick={() => open('proof')}
              >
                What can I use?
              </button>
            </div>
            <p class="ngs-caption">
              No passport. No second document. Your evidence must show that you’re currently
              studying.
            </p>
          </div>
        </div>
      </section>

      <section id="ngs-rewards" class="ngs-rewards" aria-labelledby="ngs-rewards-title">
        <div class="ngs-wrap ngs-rewards-grid">
          <div class="ngs-rewards-copy">
            <p class="ngs-eyebrow">MOVE PAYS BACK</p>
            <h2 id="ngs-rewards-title">
              A good move.
              <br />
              Worth sharing.
            </h2>
            <p>Share 12% between a discount for your friend and credit towards your next move.</p>
            <ul class="ngs-reward-facts">
              <li>Referral credit follows your friend’s completed, fully paid move.</li>
              <li>Use it for eligible Nglob services. It isn’t cash.</li>
            </ul>
            <button
              type="button"
              class="ngs-link"
              disabled={!ready()}
              onClick={() => open('rewards')}
            >
              How my credit works
            </button>
            <p class="ngs-caption ngs-account-link">
              Already moved? <a href={props.links.account}>Open your account</a>.
            </p>
          </div>
          <ReferralSplit config={props.referral} ready={ready()} />
        </div>
      </section>

      <section class="ngs-answers ngs-wrap" id="ngs-questions" aria-labelledby="ngs-faq-title">
        <div class="ngs-faq-intro">
          <p class="ngs-eyebrow">THE PRACTICAL BITS, SORTED</p>
          <h2 id="ngs-faq-title">Good question.</h2>
          <p>Clear answers for your next chapter.</p>
          <a class="ngs-link" href={props.links.contact}>
            Ask us something else
          </a>
        </div>
        <div class="ngs-answer-list">
          <details class="ngs-kit">
            <summary>
              <span>
                <span class="ngs-kit-label">SAVE THE LAST-MINUTE SCRAMBLE</span>Your moving-day
                checklist
              </span>
              <span class="ngs-plus" aria-hidden="true">
                +
              </span>
            </summary>
            <div class="ngs-kit-body">
              <For each={checklists}>
                {(group) => (
                  <section>
                    <h3>{group.title}</h3>
                    <ul>
                      <For each={group.items}>{(item) => <li>{item}</li>}</For>
                    </ul>
                  </section>
                )}
              </For>
              <button
                type="button"
                class="ngs-button ngs-button-ink"
                disabled={!ready()}
                onClick={copyChecklist}
              >
                Copy checklist
              </button>
              <p class="ngs-caption" role="status">
                {copyMessage()}
              </p>
              <Show when={copyFallback()}>
                <textarea
                  class="ngs-copy-fallback"
                  readOnly
                  aria-label="Checklist to copy"
                  value={copyChecklistText()}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </Show>
            </div>
          </details>
          <For each={faqs}>
            {(faq) => (
              <details class="ngs-faq">
                <summary>
                  {faq.question}
                  <span class="ngs-plus" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            )}
          </For>
        </div>
      </section>

      <section class="ngs-closing">
        <div class="ngs-wrap">
          <div>
            <p class="ngs-eyebrow">YOUR THINGS. YOUR NEXT CHAPTER.</p>
            <h2>
              Make room
              <br />
              for what’s next.
            </h2>
          </div>
          <div>
            <a class="ngs-button ngs-button-ink" href={props.links.quote}>
              Get my moving quote
            </a>
            <button type="button" class="ngs-link" disabled={!ready()} onClick={openVerification}>
              Check student status
            </button>
          </div>
        </div>
      </section>

      <For each={infoDialogs}>
        {(item) => (
          <Modal
            title={item.title}
            open={activeDialog() === item.key}
            onClose={() => setActiveDialog(null)}
          >
            <Show when={item.intro}>
              <p class="ngs-dialog-lead">{item.intro}</p>
            </Show>
            <For each={item.sections}>
              {(section) => (
                <section class="ngs-dialog-section">
                  <Show when={section.heading}>
                    <h3>{section.heading}</h3>
                  </Show>
                  <For each={section.paragraphs}>{(text) => <p>{text}</p>}</For>
                  <Show when={section.items?.length}>
                    <ul>
                      <For each={section.items}>{(text) => <li>{text}</li>}</For>
                    </ul>
                  </Show>
                </section>
              )}
            </For>
            <Show when={item.key === 'rewards' && confirmedReferralTerms()}>
              {(terms) => (
                <p class="ngs-info">
                  {terms().calculationNote} <a href={terms().termsUrl}>Read the programme terms</a>.
                </p>
              )}
            </Show>
            <div class="ngs-actions">
              <Show when={item.primary === 'quote'}>
                <a class="ngs-button ngs-button-ink" href={props.links.quote}>
                  {item.primaryLabel ?? 'Get my moving quote'}
                </a>
              </Show>
              <Show when={item.primary === 'account'}>
                <a class="ngs-button ngs-button-ink" href={props.links.account}>
                  {item.primaryLabel ?? 'Open my account'}
                </a>
              </Show>
              <Show when={item.primary === 'contact'}>
                <a class="ngs-button ngs-button-ink" href={props.links.contact}>
                  {item.primaryLabel ?? 'Contact Nglob'}
                </a>
              </Show>
              <Show when={item.primary === 'verify'}>
                <button
                  type="button"
                  class="ngs-button ngs-button-primary"
                  onClick={openVerification}
                >
                  {item.primaryLabel ?? 'Choose my document'}
                </button>
              </Show>
              <button
                type="button"
                class="ngs-button ngs-button-secondary"
                onClick={() => setActiveDialog(null)}
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </For>
      <VerificationDialog
        open={verificationOpen()}
        onClose={() => setVerificationOpen(false)}
        config={props.verification}
        contactUrl={props.links.contact}
        quoteUrl={props.links.quote}
      />
      <noscript>
        <p class="ngs-wrap ngs-noscript">
          Moving guidance, prices explained and FAQs are available here. Enable JavaScript to
          explore referral splits and the student-document check.
        </p>
      </noscript>
    </main>
  );
}
