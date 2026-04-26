/**
 * Onboarding response shapes (Agent Service v0.2.1).
 * @see api_contracts/agent-serviceapi-v0.2.1.md
 */

export type OnboardingUiAction = {
  type: string;
  target: string;
  tooltip: string;
};

export type OnboardingStartResponse = {
  conversation_id: string;
  /** Primary copy; duplicated in `message` (v0.2.1 UI protocol). */
  agent_message?: string;
  message?: string;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
};

export type OnboardingMessageResponse = {
  conversation_id: string;
  agent_message?: string;
  message?: string;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  profile_created?: boolean | null;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
};

export type OnboardingStatusResponse = {
  conversation_id: string;
  message: string | null;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
};
