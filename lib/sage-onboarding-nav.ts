import type { FlowEnvelopeResponse, FlowUiAction } from "@/lib/agent-onboarding-types";

/** Stable target IDs → dashboard routes (@see onboarding-flow-v2 PRD). */
export const ONBOARDING_TARGET_HREF: Record<string, string> = {
  "nav.experience_dashboard": "/dashboard",
  "experience_dashboard.experience.create_cta": "/dashboard",
  "experience.form.service_class": "/dashboard",
  "experience.form.display_year": "/dashboard",
  "experience.form.case_title": "/dashboard",
  "experience.form.case_summary": "/dashboard",
  "experience.form.prototype_link": "/dashboard",
  "experience.form.highlights": "/dashboard",
  "experience.form.save": "/dashboard",
  "onboarding.congrats.experience_recorded": "/dashboard",
  "campaigns_dashboard.project.create_cta": "/dashboard/projects",
  "campaigns_dashboard.project.campaign.create_cta": "/dashboard/projects",
  "campaign.form.title": "/dashboard/projects",
  "campaign.form.summary": "/dashboard/projects",
  "campaign.form.call_to_action": "/dashboard/projects",
  "campaign.form.link_experiences": "/dashboard/projects",
  "campaign.form.publish": "/dashboard/projects",
  "campaigns.project_url.copy": "/dashboard/projects",
  "onboarding.congrats.campaign_launched": "/dashboard/projects",
  "nav.profile": "/dashboard/profile",
  "profile.user_name.edit": "/dashboard/profile#first_name",
  "profile.resume.upload_cta": "/dashboard/profile#resumes",
  "profile.linkedin.connect_cta": "/dashboard/profile#linkedin-connect",
  "nav.campaigns_dashboard": "/dashboard/projects",
  "nav.sage_window": "/dashboard",
};

/** PRD sequence: Part 1 → Part 2 → Part 3 → return to Sage. */
const ONBOARDING_UI_ACTION_SEQUENCE: Record<string, number> = {
  "nav.experience_dashboard": 1,
  "experience_dashboard.experience.create_cta": 2,
  "experience.form.service_class": 3,
  "experience.form.display_year": 4,
  "experience.form.case_title": 5,
  "experience.form.case_summary": 6,
  "experience.form.prototype_link": 7,
  "experience.form.highlights": 8,
  "experience.form.save": 9,
  "onboarding.congrats.experience_recorded": 10,
  "nav.campaigns_dashboard": 11,
  "campaigns_dashboard.project.create_cta": 12,
  "campaigns_dashboard.project.campaign.create_cta": 13,
  "campaign.form.title": 14,
  "campaign.form.summary": 15,
  "campaign.form.call_to_action": 16,
  "campaign.form.link_experiences": 17,
  "campaign.form.publish": 18,
  "campaigns.project_url.copy": 19,
  "onboarding.congrats.campaign_launched": 20,
  "nav.profile": 21,
  "profile.user_name.edit": 22,
  "profile.resume.upload_cta": 23,
  "profile.linkedin.connect_cta": 24,
  "nav.sage_window": 25,
};

export function onboardingUiActionOrder(target: string): number {
  return ONBOARDING_UI_ACTION_SEQUENCE[target] ?? 10_000;
}

export function getOnboardingTargetHref(target: string): string | null {
  return ONBOARDING_TARGET_HREF[target] ?? null;
}

/** Appends `sage_highlight` so `DashboardSageFrame` can open the tip + highlight. */
export function buildOnboardingTaskHref(baseHref: string, target: string): string {
  const [pathWithQuery, hash = ""] = baseHref.split("#");
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  const withHint = `${pathWithQuery}${sep}sage_highlight=${encodeURIComponent(target)}`;
  return hash ? `${withHint}#${hash}` : withHint;
}

export function isOnboardingFlowType(flowType: string | null | undefined): boolean {
  return (flowType ?? "").trim().toUpperCase() === "ONBOARDING";
}

/** Next UI action client should surface in PRD order. */
export function getFirstPendingUiActionSorted(flow: FlowEnvelopeResponse): FlowUiAction | null {
  const pending = flow.ui_actions.filter((a) => a.state === "STEP_ISSUED");
  if (pending.length === 0) return null;
  return [...pending].sort((a, b) => onboardingUiActionOrder(a.target) - onboardingUiActionOrder(b.target))[0];
}
