export interface CallbackRequest {
  phone: string;
  message: string;
  bookingReference?: string;
  preferredTime?: string;
}

export interface TeamMessage {
  email: string;
  message: string;
}

/** Receipt must be confirmed by your backend, never inferred from a timeout. */
export type SubmissionResult =
  | { status: 'received' }
  | { status: 'rejected' }
  | { status: 'unknown' };

export interface SubmissionContext {
  /** Forward this key to an idempotent backend and reuse it for status checks. */
  requestId: string;
  signal: AbortSignal;
}

export type SubmissionHandler<T> = (
  data: T,
  context: SubmissionContext,
) => Promise<SubmissionResult>;

/** Queries an existing request; this callback must not create another request. */
export type StatusHandler = (
  requestId: string,
  context: { signal: AbortSignal },
) => Promise<SubmissionResult>;

export interface ContactUsPageProps {
  onCallbackSubmit?: SubmissionHandler<CallbackRequest>;
  onTeamSubmit?: SubmissionHandler<TeamMessage>;
  onCallbackStatus?: StatusHandler;
  onTeamStatus?: StatusHandler;
  onAssistantMessage?: (
    message: string,
    context: { signal: AbortSignal },
  ) => Promise<string>;
  /** Client wait limit in milliseconds; defaults to 30,000. Not a server SLA. */
  requestTimeoutMs?: number;
  /** Presentation only: hiding the notice does not connect delivery or AI. */
  showDemoNotice?: boolean;
  className?: string;
}
