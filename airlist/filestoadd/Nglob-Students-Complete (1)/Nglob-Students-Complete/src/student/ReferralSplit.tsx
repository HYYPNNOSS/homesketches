import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import type { ReferralConfig } from './types';
import { readReferralTerms } from './referral-config';

interface Props {
  config: ReferralConfig;
  ready: boolean;
}

const format = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format;
const precisePercent = (value: number) =>
  Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;

/** The component explores a configured split; it never sets a real offer or awards credit. */
export function ReferralSplit(props: Props) {
  const [chosen, setChosen] = createSignal(props.config.initialFriendShare);
  const shares = createMemo(() =>
    [...new Set(props.config.allowedFriendShares)].sort((a, b) => a - b),
  );
  const confirmedTerms = createMemo(() => readReferralTerms(props.config));
  const valid = createMemo(() => {
    const c = props.config;
    return (
      precisePercent(c.totalPercent) &&
      c.totalPercent > 0 &&
      c.totalPercent <= 100 &&
      shares().length > 0 &&
      shares().length <= 101 &&
      shares().every((n) => precisePercent(n) && n >= 0 && n <= c.totalPercent) &&
      shares().includes(c.initialFriendShare) &&
      (c.mode === 'illustrative' || confirmedTerms() !== null)
    );
  });
  createEffect(() => setChosen(props.config.initialFriendShare));
  const friend = () => (shares().includes(chosen()) ? chosen() : props.config.initialFriendShare);
  const credit = () => Math.round((props.config.totalPercent - friend()) * 100) / 100;
  const position = () => shares().indexOf(friend());
  const description = () =>
    friend() === 0
      ? `No referral saving for your friend. ${format(credit())}% in credit for you.`
      : credit() === 0
        ? `${format(friend())}% for your friend. No credit for you.`
        : `${format(friend())}% for your friend. ${format(credit())}% in credit for you.`;
  const presets = createMemo(() => {
    const options = shares();
    return [...new Set([options[0], props.config.initialFriendShare, options.at(-1)!])];
  });

  return (
    <div class="ngs-split">
      <Show
        when={valid()}
        fallback={
          <p>Referral choices are currently unavailable. Check the programme in your account.</p>
        }
      >
        <div class="ngs-split-heading">
          <span>
            {props.config.mode === 'illustrative' ? 'SEE HOW IT WORKS' : 'EXPLORE YOUR OPTIONS'}
          </span>
          <span class="ngs-pill">{format(props.config.totalPercent)}% to share</span>
        </div>
        <div class="ngs-split-values">
          <div>
            <span>Friend’s referral saving</span>
            <strong>
              {format(friend())}
              <small>%</small>
            </strong>
            <span>on their eligible move</span>
          </div>
          <div>
            <span>You receive</span>
            <strong>
              {format(credit())}
              <small>%</small>
            </strong>
            <span>in Nglob Credit</span>
          </div>
        </div>
        <label class="ngs-sr" for="ngs-referral-split">
          Your friend’s share of the referral benefit
        </label>
        <input
          id="ngs-referral-split"
          class="ngs-range"
          type="range"
          min="0"
          max={shares().length - 1}
          step="1"
          value={position()}
          disabled={!props.ready || shares().length === 1}
          aria-valuetext={description()}
          aria-describedby="ngs-split-note"
          style={{
            '--ngs-fill': `${shares().length > 1 ? (position() / (shares().length - 1)) * 100 : 50}%`,
          }}
          onInput={(event) => setChosen(shares()[Number(event.currentTarget.value)])}
        />
        <div class="ngs-range-labels">
          <span>More credit for you</span>
          <span>More for your friend</span>
        </div>
        <div class="ngs-split-controls">
          <div
            class="ngs-presets"
            role="group"
            aria-label={
              props.config.mode === 'illustrative' ? 'Example referral splits' : 'Referral splits'
            }
          >
            <For each={presets()}>
              {(share) => (
                <button
                  type="button"
                  disabled={!props.ready}
                  aria-pressed={friend() === share}
                  aria-label={`${format(share)} percent for your friend, ${format(props.config.totalPercent - share)} percent credit for you`}
                  onClick={() => setChosen(share)}
                >
                  {format(share)} / {format(props.config.totalPercent - share)}
                </button>
              )}
            </For>
          </div>
          <p class="ngs-sr" role="status">
            {description()}
          </p>
        </div>
        <p id="ngs-split-note" class="ngs-caption ngs-split-note">
          {props.config.mode === 'illustrative'
            ? 'Explore an example split. Your account shows the available options and how each benefit is calculated.'
            : confirmedTerms()?.calculationNote}
          <Show when={confirmedTerms()}>
            {(terms) => (
              <>
                {' '}
                <a href={terms().termsUrl}>Programme terms</a>.
              </>
            )}
          </Show>
        </p>
      </Show>
    </div>
  );
}
