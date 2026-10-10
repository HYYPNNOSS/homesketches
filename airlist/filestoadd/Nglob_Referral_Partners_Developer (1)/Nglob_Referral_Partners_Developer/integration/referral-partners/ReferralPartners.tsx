import { onCleanup, onMount, type JSX } from "solid-js";
import { assets, responsiveAssets } from "./assets";
import { createReferralInteractions } from "./referral-interactions";
import type { ReferralAction, ReferralController, ReferralServiceLinks } from "./referral-types";
import "./foundation.css";
import "./referral.css";

interface ReferralShellProps {
  /** Optional existing site shell. No global header/footer is added by default. */
  header?: JSX.Element;
  footer?: JSX.Element;
}
export interface ReferralPartnersProps extends ReferralShellProps {
  /** Compatibility spelling; the public component always integrates with the host. */
  mode?: "integrated";
  onAction: (action: ReferralAction) => void;
  /** Override all three service destinations with the existing site's routes. */
  serviceLinks?: ReferralServiceLinks;
  /** Available after mount; undefined again at cleanup. */
  onReady?: (controller: ReferralController | undefined) => void;
}

export default function ReferralPartners(props: ReferralPartnersProps): JSX.Element {
  if (typeof props.onAction !== "function") throw new TypeError("ReferralPartners requires an onAction callback.");
  let root!: HTMLDivElement;
  onMount(() => {
    const { controller } = createReferralInteractions(root, { onAction: action => props.onAction(action) });
    onCleanup(() => { controller.destroy(); props.onReady?.(undefined); });
    props.onReady?.(controller);
  });
  return <ReferralPartnersLayout rootRef={element => { root = element; }} header={props.header} footer={props.footer} serviceLinks={props.serviceLinks} />;
}

const defaultServiceLinks: Readonly<ReferralServiceLinks> = {
  homeMoving: "https://www.nglob.com/services/home-moving",
  fewItems: "https://www.nglob.com/services/few-items",
  storage: "https://www.nglob.com/services/storage",
};

/** Internal shared markup; preview logic and controls live in PreviewPage. */
export function ReferralPartnersLayout(props: ReferralShellProps & { rootRef: (root: HTMLDivElement) => void; preview?: boolean; children?: JSX.Element; serviceLinks?: ReferralServiceLinks }): JSX.Element {
  return (
    <div class="nglob-referral" classList={{ "nglob-referral-preview": props.preview === true }} ref={props.rootRef}>
      {props.header}
    <main id="rp">
      <section class="rp-hero" data-section="hero">
        <div class="rp-wrap rp-hero-grid">
          <div class="rp-hero-copy">
            <p class="rp-label">
              {"Referral Partners"}
            </p>
            <h1>
              {"Recommend Nglob."}
              <br />
              <em>
                {"Earn commission."}
              </em>
            </h1>
            <p class="rp-lead">
              {"Know someone moving home, collecting furniture or arranging business deliveries? Introduce them to Nglob and earn commission on eligible work once completed and paid."}
            </p>
            <p class="rp-hero-detail">
              {"Share your link or introduce a business."}
              <br />
              {"Nglob handles the service. You make the connection."}
            </p>
            <div class="rp-hero-actions">
              <button type="button" class="rp-button" data-open="join">
                {"Become a referral partner"}
              </button>
              <a class="rp-text" href="#ways">
                {"How it works"}
              </a>
            </div>
            <p class="rp-signin">
              {"Already a partner? "}
              <button type="button" class="rp-text" data-open="signin">
                {"Sign in"}
              </button>
            </p>
          </div>
          <div class="rp-branded-photo rp-brand-hero">
            <div class="rp-hero-photo">
              <img alt="Three friends enjoying a conversation together" fetchpriority="high" loading="eager" height="1024" {...responsiveAssets["hero.webp"]} width="1536" />
            </div>
          </div>
        </div>
      </section>
      <section class="rp-ways" data-section="ways" id="ways">
        <div class="rp-wrap">
          <div class="rp-heading-inline">
            <h2>
              {"Two ways to earn."}
              <br />
              {"One partner account."}
            </h2>
            <p>
              {"Start with people you know."}
              <br />
              {" No large following needed."}
            </p>
          </div>
          <div class="rp-route-grid">
            <article class="rp-route">
              <div class="rp-route-intro">
                <div class="rp-route-intro-copy">
                  <div class="rp-route-heading">
                    <span class="rp-route-number">
                      {"01"}
                    </span>
                    <h3>
                      {"Share your link"}
                    </h3>
                  </div>
                  <p>
                    {"For friends, followers and your community."}
                  </p>
                </div>
                <img alt="" aria-hidden="true" class="rp-route-scene" decoding="async" height="733" loading="lazy" {...responsiveAssets["referral.webp"]} width="1100" />
              </div>
              <ol class="rp-route-steps">
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"1"}
                  </span>
                  <span class="rp-step-copy">
                    {"Share your personal link."}
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"2"}
                  </span>
                  <span class="rp-step-copy">
                    {"Your contact books with Nglob."}
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"3"}
                  </span>
                  <span class="rp-step-copy">
                    {"Earn on eligible work once completed and paid."}
                  </span>
                </li>
              </ol>
              <div class="rp-route-footer">
                <button type="button" class="rp-text" data-intent="share" data-open="join">
                  {"Get my referral link"}
                </button>
              </div>
            </article>
            <article class="rp-route rp-route-business">
              <div class="rp-route-intro">
                <div class="rp-route-intro-copy">
                  <div class="rp-route-heading">
                    <span class="rp-route-number">
                      {"02"}
                    </span>
                    <h3>
                      {"Introduce a business"}
                    </h3>
                  </div>
                  <p>
                    {"For companies in your network."}
                  </p>
                </div>
                <img alt="" aria-hidden="true" class="rp-route-scene" decoding="async" height="733" loading="lazy" {...responsiveAssets["business.webp"]} width="1100" />
              </div>
              <ol class="rp-route-steps">
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"1"}
                  </span>
                  <span class="rp-step-copy">
                    {"Introduce a company with permission."}
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"2"}
                  </span>
                  <span class="rp-step-copy">
                    {"Nglob reviews the connection."}
                  </span>
                </li>
                <li>
                  <span aria-hidden="true" class="rp-step-index">
                    {"3"}
                  </span>
                  <span class="rp-step-copy">
                    {"They book. You can earn once eligible work is completed and paid."}
                  </span>
                </li>
              </ol>
              <div class="rp-route-footer">
                <a class="rp-text" href="#business">
                  {"Explore business introductions"}
                </a>
                <span>
                  {"Agreed earning period"}
                  <small>
                    {"Business rates agreed separately"}
                  </small>
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section class="rp-rewards" data-section="rewards" id="rewards">
        <div class="rp-wrap">
          <div class="rp-reward-heading">
            <div>
              <p class="rp-eyebrow">
                {"Personal link referrals"}
              </p>
              <h2>
                {"Referral commission,"}
                <br />
                {"made clear."}
              </h2>
            </div>
            <p>
              {"Cash commission for personal-link referrals. "}
              <br />
              {"Compare the same eligible amount at each level."}
            </p>
          </div>
          <div class="rp-calculator">
            <div class="rp-calc-input">
              <label for="revenue">
                {"Example amount eligible for commission"}
              </label>
              <div class="rp-money-field">
                <span>
                  {"£"}
                </span>
                <input aria-describedby="calc-note calc-error" id="revenue" inputMode="numeric" max="10000" min="0" step="1" type="number" value="1000" />
              </div>
              <input aria-label="Adjust example amount eligible for commission" id="revenue-range" max="10000" min="0" step="1" type="range" value="1000" />
              <div class="rp-range-labels">
                <span>
                  {"£0"}
                </span>
                <span>
                  {"£10,000"}
                </span>
              </div>
              <p class="rp-error" id="calc-error" role="status" />
            </div>
            <div class="rp-calc-results">
              <div>
                <span>
                  {"Partner "}
                  <b>
                    {"6%"}
                  </b>
                </span>
                <output aria-label="Partner 6% example commission" for="revenue revenue-range" id="commission-6">
                  {"£60"}
                </output>
              </div>
              <div>
                <span>
                  {"Pro "}
                  <b>
                    {"8%"}
                  </b>
                </span>
                <output aria-label="Pro 8% example commission" for="revenue revenue-range" id="commission-8">
                  {"£80"}
                </output>
              </div>
              <div>
                <span>
                  {"Ambassador "}
                  <b>
                    {"12%"}
                  </b>
                </span>
                <output aria-label="Ambassador 12% example commission" for="revenue revenue-range" id="commission-12">
                  {"£120"}
                </output>
              </div>
            </div>
          </div>
          <div class="rp-reward-bottom">
            <p id="calc-note">
              {"Illustrative calculations, not income forecasts. See the programme terms for level criteria and the calculation basis. Business introductions have separate terms."}
            </p>
            <div class="rp-reward-actions">
              <button type="button" class="rp-button" data-open="join">
                {"Become a referral partner"}
              </button>
              <button type="button" class="rp-text" data-open="terms">
                {"Programme guide"}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section class="rp-why" data-section="why" id="why-nglob">
        <div class="rp-wrap rp-why-grid">
          <figure class="rp-booking-figure">
            <div class="rp-figure-caption">
              {"How the item list works "}
              <span>
                {"Example"}
              </span>
            </div>
            <div class="rp-input-methods">
              <div>
                <img alt="" aria-hidden="true" class="rp-material-icon" decoding="async" height="900" loading="lazy" {...responsiveAssets["manual-list.webp"]} width="900" />
                <span>
                  {"Add items"}
                  <br />
                  <b>
                    {"manually"}
                  </b>
                </span>
              </div>
              <span class="rp-method-or">
                {"or"}
              </span>
              <div>
                <img alt="" aria-hidden="true" class="rp-material-icon" decoding="async" height="900" loading="lazy" {...responsiveAssets["photo-video.webp"]} width="900" />
                <span>
                  {"Use photos"}
                  <br />
                  <b>
                    {"or a video"}
                  </b>
                </span>
              </div>
            </div>
            <div class="rp-item-example">
              <div class="rp-item-objects rp-item-photo">
                <img alt="An example room with an armchair, two moving boxes and a floor lamp" decoding="async" height="750" loading="lazy" {...responsiveAssets["item-list-photo.webp"]} width="1000" />
              </div>
              <div class="rp-item-list">
                <p>
                  {"Example item list"}
                </p>
                <div>
                  <span>
                    {"Armchair"}
                  </span>
                  <svg aria-hidden="true" class="" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewBox="0 0 28 30">
                    <path d="M5 14l6 6L24 6" />
                  </svg>
                </div>
                <div>
                  <span>
                    {"Boxes"}
                  </span>
                  <svg aria-hidden="true" class="" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewBox="0 0 28 30">
                    <path d="M5 14l6 6L24 6" />
                  </svg>
                </div>
                <div>
                  <span>
                    {"Floor lamp"}
                  </span>
                  <svg aria-hidden="true" class="" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewBox="0 0 28 30">
                    <path d="M5 14l6 6L24 6" />
                  </svg>
                </div>
              </div>
            </div>
            <figcaption>
              <svg aria-hidden="true" class="" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" viewBox="0 0 28 30">
                <path d="M5 14l6 6L24 6" />
              </svg>
              <span>
                {"The customer reviews and confirms "}
                <strong>
                  {"before continuing with their booking."}
                </strong>
              </span>
            </figcaption>
          </figure>
          <div class="rp-why-copy">
            <p class="rp-eyebrow">
              {"The service behind your recommendation"}
            </p>
            <h2>
              {"Smart tools."}
              <br />
              {"Real-world service."}
            </h2>
            <p class="rp-why-lead">
              {"Customers can add items manually or use photos or a short video to build a list, then review it before booking."}
            </p>
            <div class="rp-responsibility">
              <span aria-hidden="true" class="rp-service-signature">
                <img alt="" decoding="async" height="82" loading="lazy" src={assets["original-shortmark.png"]} width="101" />
              </span>
              <p>
                <strong>
                  {"Your introduction. Nglob’s service."}
                </strong>
                <br />
                {"They book directly with Nglob. You do not have to organise their move or delivery."}
              </p>
            </div>
            <div aria-label="Explore Nglob services" class="rp-service-links">
              <a href={props.serviceLinks?.homeMoving ?? defaultServiceLinks.homeMoving}>
                {"Home Moving"}
              </a>
              <a href={props.serviceLinks?.fewItems ?? defaultServiceLinks.fewItems}>
                {"Few Items"}
              </a>
              <a href={props.serviceLinks?.storage ?? defaultServiceLinks.storage}>
                {"Storage"}
              </a>
            </div>
          </div>
        </div>
      </section>
      <section class="rp-business" data-section="business" id="business">
        <div class="rp-wrap">
          <div class="rp-business-top">
            <div class="rp-business-photo">
              <img alt="Three business contacts talking in a showroom" decoding="async" height="1024" loading="lazy" {...responsiveAssets["company.webp"]} width="1536" />
            </div>
            <div class="rp-business-copy">
              <p class="rp-eyebrow">
                {"For your business connections"}
              </p>
              <h2>
                {"One introduction."}
                <br />
                {"Repeat opportunities."}
              </h2>
              <p>
                {"Know a furniture store, property team or another business with regular moving or delivery needs? Introduce them with permission. Nglob reviews the connection and speaks with them directly."}
              </p>
              <button type="button" class="rp-button rp-button-light" data-intent="introduce" data-open="introduce">
                {"Introduce a business"}
              </button>
            </div>
          </div>
          <div class="rp-period-panel">
            <div class="rp-period-heading">
              <h3>
                {"An agreed start. An agreed end."}
              </h3>
              <p>
                {"Once the connection is approved, eligible company orders can earn commission during the agreed period. No repeat referral clicks are needed. Business rates are agreed separately."}
              </p>
            </div>
            <figure class="rp-period-figure">
              <figcaption>
                {"Illustration of a limited earning period "}
                <span>
                  {"Dates and eligibility are agreed with Nglob."}
                </span>
              </figcaption>
              <ol class="rp-period-track">
                <li class="rp-period-boundary">
                  <i />
                  <strong>
                    {"Agreed "}
                    <br />
                    {"start"}
                  </strong>
                </li>
                <li class="rp-period-job">
                  <i>
                    <img alt="" aria-hidden="true" class="rp-job-icon" decoding="async" height="480" loading="lazy" {...responsiveAssets["collection-icon.webp"]} width="480" />
                  </i>
                  <strong>
                    {"A collection"}
                  </strong>
                </li>
                <li class="rp-period-job">
                  <i>
                    <img alt="" aria-hidden="true" class="rp-job-icon" decoding="async" height="480" loading="lazy" {...responsiveAssets["delivery-icon.webp"]} width="480" />
                  </i>
                  <strong>
                    {"A delivery"}
                  </strong>
                </li>
                <li class="rp-period-job">
                  <i>
                    <img alt="" aria-hidden="true" class="rp-job-icon" decoding="async" height="480" loading="lazy" {...responsiveAssets["move-icon.webp"]} width="480" />
                  </i>
                  <strong>
                    {"A move"}
                  </strong>
                </li>
                <li class="rp-period-boundary">
                  <i />
                  <strong>
                    {"Agreed "}
                    <br />
                    {"end"}
                  </strong>
                </li>
              </ol>
            </figure>
            <div class="rp-business-payment">
              <p>
                <strong>
                  {"Work first. Invoice afterwards."}
                </strong>
                {" The company books in its own Business account. Nglob completes the service, then invoices. Commission is confirmed once eligible work is completed and paid."}
              </p>
              <button type="button" class="rp-text" data-open="terms">
                {"Read how the earning period works"}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section class="rp-tools" data-section="tools" id="share-tools">
        <div class="rp-wrap rp-tools-grid">
          <div class="rp-message">
            <h2>
              {"Start the conversation."}
            </h2>
            <p>
              {"Choose an example and make it sound like you. Be clear that you may earn commission."}
            </p>
            <div aria-label="Choose a message example" class="rp-message-tabs" role="tablist">
              <button type="button" aria-controls="message-panel" aria-selected="true" data-message="personal" id="message-tab-personal" role="tab" tabIndex="0">
                {"A friend"}
              </button>
              <button type="button" aria-controls="message-panel" aria-selected="false" data-message="audience" id="message-tab-audience" role="tab" tabIndex="-1">
                {"Your audience"}
              </button>
              <button type="button" aria-controls="message-panel" aria-selected="false" data-message="business" id="message-tab-business" role="tab" tabIndex="-1">
                {"A business"}
              </button>
            </div>
            <div aria-labelledby="message-tab-personal" id="message-panel" role="tabpanel">
              <label for="share-message">
                {"Your example message"}
              </label>
              <textarea id="share-message" rows="5">
                {"Ad · Planning a move or collecting furniture? Take a look at Nglob. You can use photos or a short video to build your item list, review it, then book directly. I may earn commission on eligible work booked through my link: [Your referral link]"}
              </textarea>
              <div class="rp-message-actions">
                <button type="button" class="rp-button rp-button-outline" id="copy-message">
                  {"Copy example"}
                </button>
                <button type="button" class="rp-text" data-intent="share" data-open="join">
                  {"Get my own link"}
                </button>
              </div>
              <p class="rp-copy-status" id="copy-status" role="status" />
            </div>
          </div>
          <div class="rp-faq" id="faq">
            <h2>
              {"Your questions, answered."}
            </h2>
            <details>
              <summary>
                {"Do I need a large following?"}
              </summary>
              <p>
                {"No. Personal and professional contacts count too. You can recommend Nglob to a friend, a community or a business you know."}
              </p>
            </details>
            <details>
              <summary>
                {"Can I use both referral methods?"}
              </summary>
              <p>
                {"Yes. Your personal link and business introductions belong to the same partner account. You do not have to choose a separate partner type."}
              </p>
            </details>
            <details>
              <summary>
                {"Does every introduction earn commission?"}
              </summary>
              <p>
                {"No. Eligibility rules apply. Nglob reviews business introductions before confirming whether the company can be linked to your partner account."}
              </p>
            </details>
            <details>
              <summary>
                {"Is business commission ongoing?"}
              </summary>
              <p>
                {"Business commission applies to eligible orders within an agreed earning period. It is not a lifetime arrangement. The rate, dates and eligibility are agreed with Nglob."}
              </p>
            </details>
            <details>
              <summary>
                {"When is commission confirmed?"}
              </summary>
              <p>
                {"After eligible work is completed and paid. Cancelled, unpaid or refunded work can affect commission. See the programme terms for payout arrangements."}
              </p>
            </details>
            <details>
              <summary>
                {"Can I introduce my employer?"}
              </summary>
              <p>
                {"Tell us about the relationship. Any arrangement must respect your employer’s rules and required approvals. Ask before sharing a contact’s details."}
              </p>
            </details>
            <button type="button" class="rp-text" data-open="terms">
              {"Read the programme guide"}
            </button>
          </div>
        </div>
      </section>
      <section class="rp-final" data-section="final">
        <div class="rp-wrap rp-final-grid">
          <div class="rp-final-copy">
            <h2>
              {"Who came to mind?"}
            </h2>
            <p>
              {"A friend planning a move. A business with deliveries to arrange. Bring them to Nglob."}
            </p>
            <button type="button" class="rp-button" data-open="join">
              {"Become a referral partner"}
            </button>
            <p class="rp-signin">
              {"Already a partner? "}
              <button type="button" class="rp-text" data-open="signin">
                {"Sign in"}
              </button>
            </p>
            <img alt="" aria-hidden="true" class="rp-final-signature" decoding="async" height="82" loading="lazy" src={assets["original-shortmark.png"]} width="101" />
          </div>
          <div class="rp-branded-photo rp-brand-final">
            <div class="rp-final-photo">
              <img alt="A couple welcoming a mover at their front door" decoding="async" height="1024" loading="lazy" {...responsiveAssets["move.webp"]} width="1536" />
            </div>
          </div>
        </div>
      </section>
    </main>
      {props.footer}
      {props.children}
    </div>
  );
}
