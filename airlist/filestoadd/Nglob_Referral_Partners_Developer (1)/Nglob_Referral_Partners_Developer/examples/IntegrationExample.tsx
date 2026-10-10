import {
  ReferralPartners,
  type ReferralAction,
  type ReferralIntent,
  type ReferralServiceLinks,
} from "../integration/referral-partners";

/** Supply these functions from the existing Nglob router / account application. */
export interface PartnerApplication {
  openRegistration(intent: ReferralIntent): void;
  openSignIn(intent: ReferralIntent): void;
  openLinkTools(): void;
  openBusinessIntroduction(): void;
  openProgrammeTerms(): void;
}

/** Exhaustive adapter: no invented URLs, API endpoints or successful account states. */
export function createPartnerActionHandler(app: PartnerApplication) {
  return (action: ReferralAction): void => {
    switch (action.view) {
      case "join":
        app.openRegistration(action.intent);
        return;
      case "signin":
        app.openSignIn(action.intent);
        return;
      case "share":
        app.openLinkTools();
        return;
      case "introduce":
      case "business":
        app.openBusinessIntroduction();
        return;
      case "terms":
        app.openProgrammeTerms();
        return;
      default: {
        const unexpectedView: never = action.view;
        throw new Error(`Unhandled partner action: ${unexpectedView}`);
      }
    }
  };
}

/** Mount between the existing header and footer; ReferralPartners renders <main>. */
export default function IntegrationExample(props: { app: PartnerApplication; serviceLinks: ReferralServiceLinks }) {
  return (
    <ReferralPartners
      onAction={action => createPartnerActionHandler(props.app)(action)}
      serviceLinks={props.serviceLinks}
    />
  );
}
