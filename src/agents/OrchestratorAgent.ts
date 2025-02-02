import { BaseAgent } from "./BaseAgent";
import { 
  BaseAgentMessage,
  OrchestratorMessage,
  OrchestratorConfig,
  Agent,
  AgentState,
  IMessageQueue
} from "./types";
import { MessageValidators, withTimeout, withRetry, AgentError, AgentErrorType } from "./utils";
import { PriorityMessageQueue } from "./PriorityMessageQueue";
import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from "./CircuitBreaker";
import { HealthMetrics, HealthCheckResult } from "./HealthMetrics";

interface AgentStateInfo {
  state: AgentState;
  lastActiveTime: number;
  errorCount: number;
  circuitBreaker: CircuitBreaker;
  healthMetrics: HealthMetrics;
}

/**
 * Agent responsible for orchestrating message flow between agents
 */
export class OrchestratorAgent extends BaseAgent<OrchestratorMessage, OrchestratorConfig> {
  private agents: Map<string, Agent>;
  private agentStates: Map<string, AgentStateInfo>;
  protected messageQueue: IMessageQueue<OrchestratorMessage>;

  constructor(config: OrchestratorConfig) {
    super(config);
    this.agents = new Map();
    this.agentStates = new Map();
    this.messageQueue = new PriorityMessageQueue();
  }

  /**
   * Register a new agent with the orchestrator
   */
  public registerAgent<T extends BaseAgentMessage>(
    agent: Agent<T>,
    messageTypes: string[]
  ): void {
    const agentName = agent.getName();
    
    if (this.agents.has(agentName)) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Agent with name ${agentName} is already registered`
      );
    }

    const circuitConfig: CircuitBreakerConfig = {
      failureThreshold: this.config.maxRetries ?? 3,
      resetTimeout: this.config.timeoutMs ?? 30000,
      halfOpenTimeout: (this.config.timeoutMs ?? 30000) / 2,
    };

    this.agents.set(agentName, agent);
    this.agentStates.set(agentName, {
      state: AgentState.IDLE,
      lastActiveTime: Date.now(),
      errorCount: 0,
      circuitBreaker: new CircuitBreaker(circuitConfig),
      healthMetrics: new HealthMetrics(),
    });
  }

  /**
   * Unregister an agent from the orchestrator
   */
  public unregisterAgent(agentName: string): void {
    if (!this.agents.has(agentName)) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Agent ${agentName} is not registered`
      );
    }

    this.agents.delete(agentName);
    this.agentStates.delete(agentName);
  }

  /**
   * Get an agent by name
   */
  public getAgent(agentName: string): Agent | undefined {
    return this.agents.get(agentName);
  }

  /**
   * Get the current state of an agent
   */
  public getAgentState(agentName: string): AgentState {
    const stateInfo = this.agentStates.get(agentName);
    if (!stateInfo) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Agent ${agentName} is not registered`
      );
    }
    return stateInfo.state;
  }

  public getAgentHealth(agentName: string): HealthCheckResult {
    const stateInfo = this.agentStates.get(agentName);
    if (!stateInfo) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Agent ${agentName} is not registered`
      );
    }

    const circuitMetrics = stateInfo.circuitBreaker.getMetrics();
    const healthMetrics = stateInfo.healthMetrics.getMetrics();

    return {
      healthy: this.isAgentHealthy(agentName),
      status: stateInfo.state,
      circuitState: circuitMetrics.state,
      lastCheck: Date.now(),
      metrics: healthMetrics,
    };
  }

  public async processMessage(message: OrchestratorMessage): Promise<void> {
    const validatedMessage = await MessageValidators.validateOrchestratorMessage(message);
    
    // Check queue size limits
    if (this.messageQueue.size >= (this.config.maxQueueSize ?? 1000)) {
      throw new AgentError(
        AgentErrorType.OPERATION,
        "Message queue is full",
        { currentSize: this.messageQueue.size }
      );
    }

    // Add message to queue
    await this.messageQueue.enqueue(validatedMessage);

    // Start processing if not already doing so
    if (!this.messageQueue.isProcessing) {
      void this.processQueuedMessages();
    }
  }

  protected async sendMessage(message: BaseAgentMessage): Promise<void> {
    // Orchestrator handles message routing internally
  }

  private async processQueuedMessages(): Promise<void> {
    if (this.messageQueue.isProcessing) return;
    this.messageQueue.isProcessing = true;

    try {
      while (this.messageQueue.size > 0) {
        const message = await this.messageQueue.dequeue();
        if (!message) break;

        const targetAgent = message.targetAgent;
        const agent = this.agents.get(targetAgent);
        const stateInfo = this.agentStates.get(targetAgent);

        if (!agent || !stateInfo) {
          console.warn(`Target agent ${targetAgent} not found, skipping message`);
          continue;
        }

        if (!this.isAgentHealthy(targetAgent)) {
          // Requeue message if agent is unhealthy but might recover
          if (stateInfo.errorCount < (this.config.maxRetries ?? 3)) {
            await this.messageQueue.enqueue(message);
            continue;
          }
          // Otherwise, log error and continue
          console.error(`Agent ${targetAgent} is unhealthy, dropping message`);
          continue;
        }

        try {
          await withTimeout(
            withRetry(
              () => this.routeMessage(message),
              this.config.maxRetries ?? 3,
              this.config.retryDelay ?? 1000,
              `routing to ${targetAgent}`
            ),
            this.config.timeoutMs,
            "message routing"
          );
        } catch (error) {
          console.error("Failed to process message:", error);
          // Message is dropped after max retries
        }
      }
    } finally {
      this.messageQueue.isProcessing = false;
    }
  }

  /**
   * Get current queue statistics
   */
  public getQueueStats(): {
    total: number;
    high: number;
    normal: number;
    low: number;
    isProcessing: boolean;
  } {
    const stats = (this.messageQueue as PriorityMessageQueue<OrchestratorMessage>).getStats();
    return {
      ...stats,
      isProcessing: this.messageQueue.isProcessing,
    };
  }

  private async routeMessage(message: OrchestratorMessage): Promise<void> {
    const { targetAgent } = message;
    const agent = this.agents.get(targetAgent);
    const stateInfo = this.agentStates.get(targetAgent);

    if (!agent || !stateInfo) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        `Target agent ${targetAgent} not found`
      );
    }

    const startTime = Date.now();
    try {
      await stateInfo.circuitBreaker.execute(
        async () => {
          stateInfo.state = AgentState.WORKING;
          stateInfo.lastActiveTime = Date.now();
          await agent.processMessage(message);
          stateInfo.state = AgentState.IDLE;
          stateInfo.errorCount = 0;
          
          // Record successful processing
          const processingTime = Date.now() - startTime;
          stateInfo.healthMetrics.recordSuccess(processingTime);
        },
        `processing message for agent ${targetAgent}`
      );
    } catch (error) {
      stateInfo.state = AgentState.ERROR;
      stateInfo.errorCount++;

      // Record failed processing
      const processingTime = Date.now() - startTime;
      stateInfo.healthMetrics.recordError(processingTime);

      throw new AgentError(
        AgentErrorType.OPERATION,
        `Message processing failed for agent ${targetAgent}`,
        error
      );
    }
  }

  /**
   * Check if an agent is healthy based on its state and error count
   */
  private isAgentHealthy(agentName: string): boolean {
    const stateInfo = this.agentStates.get(agentName);
    if (!stateInfo) return false;

    const circuitState = stateInfo.circuitBreaker.getState();
    const maxInactiveTime = this.config.timeoutMs ?? 30000;
    const currentTime = Date.now();

    return (
      circuitState !== CircuitState.OPEN &&
      currentTime - stateInfo.lastActiveTime < maxInactiveTime &&
      stateInfo.state !== AgentState.ERROR
    );
  }
}