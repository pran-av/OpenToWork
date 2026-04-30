/**
 * Onboarding response shapes (Agent Service v0.2.3).
 * @see api_contracts/agent-serviceapi-v0.2.3.md
 */

export type OnboardingUiAction = {
  type: string;
  target: string;
  tooltip: string;
};

export type OnboardingUiActionProgress = {
  total_actions: number;
  completed_actions: number;
  all_completed: boolean;
  pending_targets: string[];
};

/** Set when the agent service could or could not read `public.users` (Supabase) for the session. */
export type PublicUsersReadStatus = {
  ok: boolean;
  error?: string;
};

export type OnboardingStartResponse = {
  conversation_id: string;
  /** Primary copy; duplicated in `message` (UI protocol). */
  agent_message?: string;
  message?: string;
  /** e.g. `onboarding` — for multi-flow clients, use for progress labels instead of `current_step` ids. */
  flow_type?: string | null;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
  ui_action_progress?: OnboardingUiActionProgress | null;
  public_users_read?: PublicUsersReadStatus | null;
};

export type OnboardingMessageResponse = {
  conversation_id: string;
  agent_message?: string;
  message?: string;
  flow_type?: string | null;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  profile_created?: boolean | null;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
  ui_action_progress?: OnboardingUiActionProgress | null;
  public_users_read?: PublicUsersReadStatus | null;
};

export type OnboardingStatusResponse = {
  conversation_id: string;
  message: string | null;
  flow_type?: string | null;
  status: string;
  next_step: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
  ui_action_progress?: OnboardingUiActionProgress | null;
  public_users_read?: PublicUsersReadStatus | null;
};

export type ActiveOnboardingConversation = {
  conversation_id: string;
  status: "active";
  next_step: string | null;
  current_step: string | null;
  completed_steps: string[];
  pending_steps: string[];
  progress_percent: number;
  last_agent_message: string | null;
  started_at: string;
  ui_actions: OnboardingUiAction[] | null;
  step_id: string | null;
  ui_action_progress: OnboardingUiActionProgress | null;
};

export type ActiveOnboardingConversationsResponse = {
  conversations: ActiveOnboardingConversation[];
  total: number;
};

export type CompleteOnboardingUiActionRequest = {
  target: string;
  step_id: string;
  completed: boolean;
  metadata?: Record<string, unknown>;
};

export type CompleteOnboardingUiActionResponse = OnboardingStatusResponse;

export type OnboardingClientPayload = {
  conversation_id?: string;
  agent_message?: string;
  message?: string;
  flow_type?: string | null;
  status?: string;
  next_step?: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  profile_created?: boolean | null;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
  ui_action_progress?: OnboardingUiActionProgress | null;
  public_users_read?: PublicUsersReadStatus | null;
};

export type FlowType = "ONBOARDING" | string;
export type FlowState = "FLOW_ACTIVE" | "FLOW_COMPLETED" | "FLOW_ABANDONED" | string;
export type StepActorType = "SERVER" | "CLIENT" | "USER" | string;
export type StepState = "STEP_ISSUED" | "STEP_DONE" | "STEP_SKIPPED" | string;

export type FlowInstance = {
  id: string;
  flow_type: FlowType;
  flow_key: string;
  state: FlowState;
  conversation_id: string | null;
  started_at: string;
  expires_at: string | null;
  ended_at: string | null;
};

export type FlowStep = {
  step_key: string;
  actor_type: StepActorType;
  state: StepState;
  is_skippable: boolean;
};

export type FlowUiAction = {
  target: string;
  tooltip: string;
  message?: string | null;
  state: StepState;
  is_skippable: boolean;
  parent_action_id?: string | null;
};

export type FlowProgress = {
  completed_count: number;
  pending_count: number;
  percent: number;
  blocking_items: string[];
};

export type FlowEnvelopeResponse = {
  flow_instance: FlowInstance;
  steps: FlowStep[];
  ui_actions: FlowUiAction[];
  progress: FlowProgress;
};

export type FlowListResponse = {
  flows?: FlowEnvelopeResponse[];
  items?: FlowEnvelopeResponse[];
  data?: FlowEnvelopeResponse[];
};
