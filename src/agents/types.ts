import { z } from "zod";

/**
 * Base message schema that all agent messages must extend
 */
export const BaseMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  targetAgent: z.string(),
  payload: z.any(),
  priority: z.number().optional(),
  timestamp: z.number().optional(),
});

export type BaseAgentMessage = z.infer<typeof BaseMessageSchema>;

/**
 * Version check message schema
 */
export const VersionCheckSchema = BaseMessageSchema.extend({
  type: z.literal("VERSION_CHECK"),
  payload: z.object({
    viteVersion: z.string(),
    reactVersion: z.string().optional(),
    nextVersion: z.string().optional(),
  }),
});

export type VersionCheckMessage = z.infer<typeof VersionCheckSchema>;

/**
 * Lint request message schema
 */
export const LintRequestSchema = BaseMessageSchema.extend({
  type: z.literal("LINT_REQUEST"),
  payload: z.object({
    code: z.string(),
    filePath: z.string(),
    fix: z.boolean().optional(),
  }),
});

export type LintRequestMessage = z.infer<typeof LintRequestSchema>;

/**
 * Deployment request message schema
 */
export const DeploymentRequestSchema = BaseMessageSchema.extend({
  type: z.literal("DEPLOYMENT_REQUEST"),
  payload: z.object({
    projectPath: z.string(),
    buildConfig: z.record(z.any()).optional(),
    timeout: z.number().optional(),
  }),
});

export type DeploymentRequestMessage = z.infer<typeof DeploymentRequestSchema>;

/**
 * Orchestrator message schema
 */
export const OrchestratorMessageSchema = BaseMessageSchema.extend({
  type: z.string(),
  payload: z.any(),
  targetAgent: z.string(),
});

export type OrchestratorMessage = z.infer<typeof OrchestratorMessageSchema>;

/**
 * Agent state enumeration
 */
export enum AgentState {
  IDLE = "IDLE",
  WORKING = "WORKING",
  ERROR = "ERROR",
}

/**
 * Base configuration interface for all agents
 */
export interface AgentConfig {
  name: string;
  maxRetries?: number;
  maxQueueSize?: number;
  maxConcurrentTasks?: number;
  timeoutMs?: number;
}

/**
 * Compatibility agent configuration
 */
export interface CompatibilityConfig extends AgentConfig {
  supportedVersions?: {
    vite?: string[];
    react?: string[];
    next?: string[];
  };
}

/**
 * ESLint agent configuration
 */
export interface ESLintConfig extends AgentConfig {
  autoFix?: boolean;
  configPath?: string;
  rules?: Record<string, unknown>;
}

/**
 * Deployment agent configuration
 */
export interface DeploymentConfig extends AgentConfig {
  maxRetries?: number;
  artifactsPath?: string;
  buildTimeout?: number;
}

/**
 * Orchestrator agent configuration
 */
export interface OrchestratorConfig extends AgentConfig {
  maxConcurrentMessages?: number;
  routingTimeout?: number;
  retryDelay?: number;
}

/**
 * Queue item interface
 */
export interface QueueItem<T extends BaseAgentMessage = BaseAgentMessage> {
  message: T;
  addedAt: number;
}

/**
 * Message queue interface
 */
export interface IMessageQueue<T extends BaseAgentMessage = BaseAgentMessage> {
  enqueue(message: T): Promise<void>;
  dequeue(): Promise<T | undefined>;
  clear(): void;
  size: number;
  isProcessing: boolean;
}

/**
 * Message handler type
 */
export type MessageHandler<T extends BaseAgentMessage> = (message: T) => Promise<void>;

/**
 * Agent type for type-safe agent registration
 */
export interface Agent<T extends BaseAgentMessage = BaseAgentMessage> {
  getName(): string;
  getState(): AgentState;
  getLastActiveTime(): number;
  getConfig(): Required<AgentConfig>;
  processMessage(message: T): Promise<void>;
}

/**
 * ESLint message type
 */
export interface ESLintMessage extends BaseAgentMessage {
  type: "LINT_REQUEST";
  payload: {
    filePath: string;
    fileContent?: string;
  };
}

/**
 * ESLint result message
 */
export interface LintResult {
  filePath: string;
  errorCount: number;
  warningCount: number;
  messages: Array<{
    ruleId: string;
    severity: number;
    message: string;
    line: number;
    column: number;
    fix?: {
      range: [number, number];
      text: string;
    };
  }>;
  source?: string;
  output?: string;
}

/**
 * Deployment message type
 */
export interface DeploymentMessage extends BaseAgentMessage {
  type: "DEPLOYMENT_REQUEST";
  payload: {
    projectPath: string;
    buildConfig?: {
      base?: string;
      outDir?: string;
      minify?: boolean;
      sourcemap?: boolean;
    };
  };
}

/**
 * Deployment status type
 */
export interface DeploymentStatus {
  status: "PENDING" | "IN_PROGRESS" | "RETRYING" | "COMPLETED" | "FAILED" | "CANCELLED";
  startTime: number;
  completionTime?: number;
  buildPath?: string;
  retryCount?: number;
  error?: string;
} 