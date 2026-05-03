/**
 * Flows v2 / onboarding shapes (Agent Service v2.1.0).
 * @see api_contracts/agent-serviceapi-v2.1.0.md
 */

export type FlowType = "ONBOARDING" | string;
export type FlowState = "FLOW_ACTIVE" | "FLOW_COMPLETED" | "FLOW_ABANDONED" | string;
export type StepActorType = "SERVER" | "CLIENT" | "USER" | string;
export type StepState = "STEP_ISSUED" | "STEP_DONE" | "STEP_SKIPPED" | string;

export type SageFlowMessage = {
  step_key: string;
  role: "sage" | string;
  content: string;
  created_at: string;
};

export type FlowInstance = {
  id: string;
  flow_type: FlowType;
  flow_key: string;
  state: FlowState;
  conversation_id: string | null;
  started_at: string;
  expires_at: string | null;
  ended_at: string | null;
  /** Server-authored markdown lines keyed by `step_key` (see contract §7). */
  sage_messages?: SageFlowMessage[];
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
