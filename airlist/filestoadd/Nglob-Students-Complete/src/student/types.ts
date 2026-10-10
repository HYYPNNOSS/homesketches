export type DialogKey =
  | 'halls'
  | 'flatshare'
  | 'summer'
  | 'storage'
  | 'pricing'
  | 'proof'
  | 'rewards';

export interface StudentLinks {
  quote: string;
  account: string;
  contact: string;
}

export interface VerificationResult {
  id: string;
  status: 'received' | 'reviewing' | 'approved' | 'rejected';
  reason?: string;
}

/** Authentication, upload security, validation and review decisions belong to the host service. */
export interface VerificationService {
  submit(
    file: File,
    options: { signal: AbortSignal; idempotencyKey: string },
  ): Promise<VerificationResult>;
  getStatus(id: string, options: { signal: AbortSignal }): Promise<VerificationResult>;
}

export type VerificationPreviewState =
  | 'choose'
  | 'review'
  | 'uploading'
  | 'received'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'error';

export type VerificationConfig =
  | { mode: 'preview'; initialState?: VerificationPreviewState }
  | { mode: 'unavailable' }
  | {
      mode: 'live';
      service: VerificationService;
      privacyNoticeUrl: string;
      privacySummary: string;
    };

export type ReferralConfig = {
  /** Percentages accept up to two decimal places. The current approved programme total is 12. */
  totalPercent: number;
  allowedFriendShares: readonly number[];
  initialFriendShare: number;
} & (
  | { mode: 'illustrative' }
  | { mode: 'confirmed'; termsUrl: string; calculationNote: string }
);

export interface StudentPageProps {
  links: StudentLinks;
  verification: VerificationConfig;
  referral: ReferralConfig;
  assetBase?: string;
  /** A fact-checked offer sentence, not a placeholder or an unapproved percentage. */
  studentOffer?: string;
}

export interface DialogSection {
  heading?: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
}

export interface InfoDialogContent {
  key: DialogKey;
  title: string;
  intro?: string;
  sections: readonly DialogSection[];
  primary?: 'quote' | 'account' | 'contact' | 'verify';
  primaryLabel?: string;
}
