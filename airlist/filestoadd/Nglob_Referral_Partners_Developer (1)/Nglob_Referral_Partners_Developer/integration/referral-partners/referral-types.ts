/** The public page delegates these actions to the host application. */
export type ReferralView = "join" | "signin" | "share" | "introduce" | "business" | "terms";
export type ReferralIntent = "join" | "share" | "introduce";
/** Real service destinations supplied by the host router, including its base path. */
export interface ReferralServiceLinks {
  homeMoving: string;
  fewItems: string;
  storage: string;
}
export interface ReferralAction {
  view: ReferralView;
  intent: ReferralIntent;
}
export interface ReferralController {
  open(view: ReferralView, intent?: ReferralIntent): void;
  destroy(): void;
}
export interface ReferralInteractionOptions {
  onAction: (action: ReferralAction) => void;
}

const views: ReadonlySet<string> = new Set(["join", "signin", "share", "introduce", "business", "terms"]);
export function isReferralView(value: string): value is ReferralView {
  return views.has(value);
}
export function isReferralIntent(value: string | undefined): value is ReferralIntent {
  return value === "join" || value === "share" || value === "introduce";
}
export function referralIntent(view: string): ReferralIntent {
  return view === "introduce" || view === "business" ? "introduce" : view === "share" ? "share" : "join";
}
