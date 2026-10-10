import type { ReferralConfig } from './types';

/** Keep both the calculator and its details dialog safe for untyped host data. */
export function readReferralTerms(config: ReferralConfig) {
  if (config.mode !== 'confirmed') return null;
  if (typeof config.termsUrl !== 'string' || typeof config.calculationNote !== 'string')
    return null;
  const termsUrl = config.termsUrl.trim();
  const calculationNote = config.calculationNote.trim();
  if (!termsUrl || termsUrl.startsWith('#') || !calculationNote) return null;
  try {
    const url = new URL(termsUrl, 'https://local.invalid/');
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.pathname === '/') {
      return null;
    }
  } catch {
    return null;
  }
  return { termsUrl, calculationNote };
}
