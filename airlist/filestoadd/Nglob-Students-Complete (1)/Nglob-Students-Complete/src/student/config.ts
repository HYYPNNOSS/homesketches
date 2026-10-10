import type { ReferralConfig, StudentLinks, VerificationConfig } from './types';

/** Approved navigation. Reuse the host router's equivalent URLs if the origin differs. */
export const studentLinks: Readonly<StudentLinks> = {
  quote: 'https://app.nglob.com/',
  account: 'https://app.nglob.com/',
  contact: 'https://www.nglob.com/contact',
};

/** Safe public fallback until the host's document-review service is connected. */
export const unavailableVerification: VerificationConfig = { mode: 'unavailable' };

/** A labelled calculator example; changing its value never changes a live referral. */
export const exampleReferralConfig: ReferralConfig = {
  mode: 'illustrative',
  totalPercent: 12,
  allowedFriendShares: [2, 4, 6, 8, 10],
  initialFriendShare: 6,
};
