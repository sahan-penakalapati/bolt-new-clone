export * from "./types";
export { BaseAgent } from "./BaseAgent";
export { MessageQueue } from "./MessageQueue";

// Message type constants
export const MESSAGE_TYPES = {
  LINT_REQUEST: "LINT_REQUEST",
  VERSION_CHECK: "VERSION_CHECK",
  DEPLOYMENT_REQUEST: "DEPLOYMENT_REQUEST",
} as const;

// Agent name constants
export const AGENT_NAMES = {
  ORCHESTRATOR: "orchestrator",
  COMPATIBILITY: "compatibility",
  ESLINT: "eslint",
  DEPLOYMENT: "deployment",
} as const; 