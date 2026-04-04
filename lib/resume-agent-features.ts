/**
 * Temporary kill-switch before agent service is reliably available in all environments.
 * Set NEXT_PUBLIC_RESUME_AGENT_FEATURES_DISABLED=true to:
 * - hide resume/scoring UI on dashboard and profile
 * - short-circuit resume/scoring API routes (no upstream fetch → no ECONNREFUSED noise)
 */
export function isResumeAgentFeaturesDisabled(): boolean {
  return process.env.NEXT_PUBLIC_RESUME_AGENT_FEATURES_DISABLED === "true";
}
