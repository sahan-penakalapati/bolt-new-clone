import { z } from "zod";
import { 
  BaseAgentMessage, 
  VersionCheckSchema, 
  LintRequestSchema, 
  DeploymentRequestSchema,
  OrchestratorMessageSchema,
  VersionCheckMessage,
  ESLintMessage,
  DeploymentMessage,
} from "./types";

/**
 * Error types for agent operations
 */
export enum AgentErrorType {
  VALIDATION = "validation",
  TIMEOUT = "timeout",
  QUEUE_FULL = "queue_full",
  INTERNAL = "internal",
}

/**
 * Base error class for agent operations
 */
export class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string
  ) {
    super(message);
    this.name = "AgentError";
  }
}

/**
 * Validate a message against a schema
 */
export async function validateMessage<T extends BaseAgentMessage>(
  message: unknown,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    return await schema.parseAsync(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Invalid message format: ${error.message}`,
        error
      );
    }
    throw new AgentError(
      AgentErrorType.VALIDATION,
      "Invalid message format",
      error
    );
  }
}

/**
 * Message validators for each agent type
 */
export const MessageValidators = {
  async validateVersionCheck(message: unknown) {
    return validateMessage(message, VersionCheckSchema);
  },

  async validateLintRequest(message: unknown) {
    return validateMessage(message, LintRequestSchema);
  },

  async validateDeploymentRequest(message: BaseAgentMessage): Promise<DeploymentMessage> {
    if (message.type !== "DEPLOYMENT_REQUEST") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Invalid message type: ${message.type}, expected DEPLOYMENT_REQUEST`
      );
    }

    const payload = message.payload;
    if (!payload || typeof payload !== "object") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid payload: expected object"
      );
    }

    if (!payload.projectPath || typeof payload.projectPath !== "string") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid payload: projectPath is required and must be a string"
      );
    }

    if (payload.buildConfig && typeof payload.buildConfig !== "object") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid payload: buildConfig must be an object"
      );
    }

    return message as DeploymentMessage;
  },

  async validateOrchestratorMessage(message: unknown) {
    return validateMessage(message, OrchestratorMessageSchema);
  },

  validateDeployment: async (message: unknown): Promise<DeploymentMessage> => {
    if (!message || typeof message !== "object") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid message format",
        { message }
      );
    }

    const msg = message as Record<string, unknown>;

    if (msg.type !== "DEPLOYMENT") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid message type",
        { expectedType: "DEPLOYMENT", actualType: msg.type }
      );
    }

    if (!msg.payload || typeof msg.payload !== "object") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid payload format",
        { payload: msg.payload }
      );
    }

    const payload = msg.payload as Record<string, unknown>;

    if (typeof payload.deploymentId !== "string") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid deploymentId",
        { deploymentId: payload.deploymentId }
      );
    }

    if (!["START", "CHECK", "CANCEL"].includes(payload.action as string)) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid action",
        { action: payload.action }
      );
    }

    if (payload.action === "START" && typeof payload.buildPath !== "string") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Missing buildPath for START action",
        { buildPath: payload.buildPath }
      );
    }

    return message as DeploymentMessage;
  },
};

/**
 * Wrap an async operation with timeout
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AgentError(
        AgentErrorType.TIMEOUT,
        `${operationName} timed out after ${timeoutMs}ms`
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 1000,
  operationName: string = "unknown"
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw new AgentError(
          AgentErrorType.OPERATION,
          `Operation ${operationName} failed after ${maxRetries} retries`,
          lastError
        );
      }
      
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // This should never happen due to the throw above
  throw lastError;
} 