/**
 * Targets where the Sage task modal must not offer "Next" — the real in-page primary
 * action (Save / Create / Add) confirms the step via {@link dispatchSagePrimaryActionDone}.
 * @see prd-files/onboarding-flow-v2.md
 */

export type SagePrimaryActionDoneDetail = {
  target:
    | "experience.form.save"
    | "experience_dashboard.experience.create_cta"
    | "campaigns_dashboard.project.create_cta"
    | "campaigns_dashboard.project.campaign.create_cta";
  /** Set by DashboardSageFrame when it handles this event for the active tour modal. */
  markHandled?: () => void;
};

export const SAGE_PRIMARY_ACTION_DONE_EVENT = "openTowork:sage-primary-action-done";

export function onboardingHidesNextForPrimary(target: string | null | undefined): boolean {
  if (!target) return false;
  return (
    target === "experience.form.save" ||
    target === "experience_dashboard.experience.create_cta" ||
    target === "campaigns_dashboard.project.create_cta" ||
    target === "campaigns_dashboard.project.campaign.create_cta"
  );
}

export function dispatchSagePrimaryActionDone(
  target: SagePrimaryActionDoneDetail["target"]
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAGE_PRIMARY_ACTION_DONE_EVENT, { detail: { target } }));
}
