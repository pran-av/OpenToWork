/**
 * Targets where the Sage task modal must not offer "Next" — the real in-page primary
 * action (Save / Create / Add) confirms the step via {@link dispatchSagePrimaryActionDone}.
 * @see prd-files/onboarding-flow-v2.md
 */

import {
  SAGE_ONBOARDING_CAMPAIGN_EDITOR_PATH_KEY,
  SAGE_ONBOARDING_PROJECT_EDITOR_PATH_KEY,
} from "@/lib/sage-onboarding-nav";

export type SagePrimaryActionDoneDetail = {
  target:
    | "experience.form.save"
    | "experience_dashboard.experience.create_cta"
    | "campaigns_dashboard.project.create_cta"
    | "campaigns_dashboard.project.campaign.create_cta"
    | "campaign.form.publish";
  /** Invoked synchronously by the dashboard Sage frame when it owns this primary action. */
  markHandled?: () => void;
};

export type SagePrimaryActionDispatchOptions = {
  /**
   * Persist before the ack/navigation chain so `getResolvedOnboardingTaskHref` resolves
   * to the newly created project/campaign (avoids racing client navigations).
   */
  sageSessionProjectPath?: string;
  sageSessionCampaignPath?: string;
  /**
   * Runs after a microtask if nothing called {@link SagePrimaryActionDoneDetail.markHandled}
   * synchronously (no active Sage tour for this action). Use for normal app navigation.
   */
  onUnconsumed?: () => void;
};

export const SAGE_PRIMARY_ACTION_DONE_EVENT = "openTowork:sage-primary-action-done";

export function onboardingHidesNextForPrimary(target: string | null | undefined): boolean {
  if (!target) return false;
  return (
    target === "experience.form.save" ||
    target === "experience_dashboard.experience.create_cta" ||
    target === "campaigns_dashboard.project.create_cta" ||
    target === "campaigns_dashboard.project.campaign.create_cta" ||
    target === "campaign.form.publish"
  );
}

/** Profile Part 3: ACK only after server confirms persisted data (@see onboarding-flow-v2 PRD). */
export type SageProfileVerificationTarget =
  | "profile.user_name.edit"
  | "profile.resume.upload_cta"
  | "profile.linkedin.connect_cta";

export const SAGE_PROFILE_VERIFICATION_DONE_EVENT = "openTowork:sage-profile-verification-done";

export type SageProfileVerificationDoneDetail = {
  target: SageProfileVerificationTarget;
};

export function onboardingProfileRequiresDbVerification(
  target: string | null | undefined
): target is SageProfileVerificationTarget {
  return (
    target === "profile.user_name.edit" ||
    target === "profile.resume.upload_cta" ||
    target === "profile.linkedin.connect_cta"
  );
}

export function dispatchSageProfileVerificationDone(target: SageProfileVerificationTarget): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SAGE_PROFILE_VERIFICATION_DONE_EVENT, {
      detail: { target } satisfies SageProfileVerificationDoneDetail,
    })
  );
}

export function dispatchSagePrimaryActionDone(
  target: SagePrimaryActionDoneDetail["target"],
  options?: SagePrimaryActionDispatchOptions
): void {
  if (typeof window === "undefined") return;

  try {
    if (options?.sageSessionProjectPath) {
      sessionStorage.setItem(SAGE_ONBOARDING_PROJECT_EDITOR_PATH_KEY, options.sageSessionProjectPath);
    }
    if (options?.sageSessionCampaignPath) {
      sessionStorage.setItem(SAGE_ONBOARDING_CAMPAIGN_EDITOR_PATH_KEY, options.sageSessionCampaignPath);
    }
  } catch {
    // ignore
  }

  let handled = false;
  const markHandled = () => {
    handled = true;
  };

  window.dispatchEvent(
    new CustomEvent(SAGE_PRIMARY_ACTION_DONE_EVENT, {
      detail: { target, markHandled } satisfies SagePrimaryActionDoneDetail,
    })
  );

  if (!options?.onUnconsumed) return;

  queueMicrotask(() => {
    if (!handled) {
      options.onUnconsumed?.();
    }
  });
}
