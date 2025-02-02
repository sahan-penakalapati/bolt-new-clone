import { MessageQueue } from "./MessageQueue";
import { BaseAgentMessage, BaseMessageSchema, AgentState, Agent, AgentConfig } from "./types";
import { z } from "zod";
import { AgentError, AgentErrorType } from "./utils";

type RequiredBaseConfig = Required<AgentConfig>;

/**
 * Abstract base class for all agents in the system
 */
export abstract class BaseAgent<T extends BaseAgentMessage = BaseAgentMessage, C extends AgentConfig = AgentConfig> implements Agent<T> {
  protected name: string;
  protected state: AgentState = AgentState.IDLE;
  protected lastActiveTime: number = Date.now();
  protected maxRetries: number;
  protected messageQueue: MessageQueue;
  protected config: RequiredBaseConfig & C;

  constructor(config: C) {
    this.name = config.name;
    // Initialize with default values for base config
    const baseConfig: RequiredBaseConfig = {
      name: config.name,
      maxRetries: config.maxRetries ?? 3,
      maxQueueSize: config.maxQueueSize ?? 1000,
      maxConcurrentTasks: config.maxConcurrentTasks ?? 1,
      timeoutMs: config.timeoutMs ?? 30000,
    };
    
    // Merge base config with specialized config
    this.config = { ...baseConfig, ...config } as RequiredBaseConfig & C;
    this.maxRetries = this.config.maxRetries;
    this.messageQueue = new MessageQueue(this.config.maxQueueSize);
  }

  /**
   * Process an incoming message - this should be implemented by derived classes
   */
  public abstract processMessage(message: T): Promise<void>;

  /**
   * Send a message to another agent
   */
  protected abstract sendMessage(message: BaseAgentMessage): Promise<void>;

  /**
   * Get the current state of the agent
   */
  public getState(): AgentState {
    return this.state;
  }

  /**
   * Handle state transitions
   */
  protected setState(state: AgentState): void {
    this.state = state;
    this.lastActiveTime = Date.now();
  }

  /**
   * Add a message to the processing queue
   */
  public async enqueueMessage(message: T): Promise<void> {
    if (!this.messageQueue) {
      throw new Error("Message queue not initialized");
    }
    const validatedMessage = await this.validateMessage(message);
    await this.messageQueue.enqueue(validatedMessage);
  }

  /**
   * Process the next message in the queue
   */
  protected async processNextMessage(): Promise<void> {
    if (!this.messageQueue) {
      throw new Error("Message queue not initialized");
    }

    try {
      const message = await this.messageQueue.dequeue();
      
      if (!message) {
        this.setState(AgentState.IDLE);
        return;
      }

      this.setState(AgentState.WORKING);
      this.messageQueue.setProcessing(true);

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new AgentError(
              AgentErrorType.TIMEOUT,
              `Message processing timed out after ${this.config.timeoutMs}ms`
            ));
          }, this.config.timeoutMs);
        });

        await Promise.race([
          this.processMessage(message as T),
          timeoutPromise,
        ]).finally(() => {
          this.messageQueue.setProcessing(false);
        });

        this.setState(AgentState.IDLE);
      } catch (error) {
        this.setState(AgentState.ERROR);
        throw error instanceof AgentError ? error : new AgentError(
          AgentErrorType.INTERNAL,
          error instanceof Error ? error.message : "Unknown error occurred"
        );
      }
    } catch (error) {
      this.messageQueue.setProcessing(false);
      this.setState(AgentState.ERROR);
      throw error;
    }
  }

  /**
   * Stop all processing and clear the queue
   */
  public emergencyStop(): void {
    if (this.messageQueue) {
      this.messageQueue.clear();
      this.setState(AgentState.IDLE);
    }
  }

  public getName(): string {
    return this.name;
  }

  /**
   * Internal message handler that manages state transitions and error handling
   */
  private async handleMessage(message: T): Promise<void> {
    let retryCount = 0;
    
    while (retryCount <= this.maxRetries) {
      try {
        this.setState(AgentState.WORKING);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new AgentError(
              AgentErrorType.TIMEOUT,
              `Message processing timed out after ${this.config.timeoutMs}ms`
            ));
          }, this.config.timeoutMs);
        });

        await Promise.race([
          this.processMessage(message),
          timeoutPromise,
        ]).finally(() => {
          this.messageQueue.setProcessing(false);
        });
        
        this.setState(AgentState.IDLE);
        return;
      } catch (error) {
        this.setState(AgentState.ERROR);
        retryCount++;
        
        if (retryCount > this.maxRetries) {
          throw error instanceof AgentError ? error : new AgentError(
            AgentErrorType.INTERNAL,
            error instanceof Error ? error.message : "Unknown error occurred"
          );
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  protected async validateMessage(message: unknown): Promise<T> {
    try {
      return BaseMessageSchema.parse(message) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AgentError(
          AgentErrorType.VALIDATION,
          `Invalid message format: ${error.message}`
        );
      }
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Invalid message format"
      );
    }
  }

  public getLastActiveTime(): number {
    return this.lastActiveTime;
  }

  /**
   * Get the agent's configuration
   */
  public getConfig(): Required<AgentConfig> {
    return {
      name: this.config.name,
      maxRetries: this.config.maxRetries,
      maxQueueSize: this.config.maxQueueSize,
      maxConcurrentTasks: this.config.maxConcurrentTasks,
      timeoutMs: this.config.timeoutMs,
    };
  }

  /**
   * Reset the agent to its initial state
   */
  public reset(): void {
    this.state = AgentState.IDLE;
    this.lastActiveTime = Date.now();
    this.messageQueue.clear();
  }
}

export { AgentState };
export type { AgentConfig, BaseAgentMessage }; 