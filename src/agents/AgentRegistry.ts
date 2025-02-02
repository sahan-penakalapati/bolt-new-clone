import { BaseAgent } from "./BaseAgent";
import { CompatibilityAgent } from "./CompatibilityAgent";
import { ESLintAgent } from "./ESLintAgent";
import { DeploymentAgent } from "./DeploymentAgent";
import { OrchestratorAgent } from "./OrchestratorAgent";
import { AgentState, Agent, BaseAgentMessage } from "./types";

/**
 * Registry configuration type
 */
export interface RegistryConfig {
  maxAgents?: number;
  healthCheckIntervalMs?: number;
}

/**
 * Agent health status type
 */
export interface AgentHealth {
  name: string;
  state: AgentState;
  lastActive?: number;
}

/**
 * Registry for managing all agents in the system
 */
export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private agents: Map<string, Agent> = new Map();
  private maxAgents: number;
  private healthCheckInterval: number;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: Map<string, AgentHealth> = new Map();
  private orchestrator: OrchestratorAgent | null = null;

  private constructor(config?: RegistryConfig) {
    this.maxAgents = config?.maxAgents ?? 10;
    this.healthCheckInterval = config?.healthCheckIntervalMs ?? 1000;
    this.startHealthCheck();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: RegistryConfig): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry(config);
    }
    return AgentRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (AgentRegistry.instance) {
      AgentRegistry.instance.dispose();
    }
    AgentRegistry.instance = null;
  }

  /**
   * Initialize the core agents
   */
  public async initializeCoreAgents(): Promise<void> {
    // Reset any existing agents
    this.agents.clear();
    this.lastHealthCheck.clear();
    
    // Initialize orchestrator first
    this.orchestrator = new OrchestratorAgent({ name: "orchestrator" });
    await this.registerAgent("orchestrator", this.orchestrator);

    // Initialize core agents
    const compatibilityAgent = new CompatibilityAgent({ name: "compatibility" });
    const eslintAgent = new ESLintAgent({ name: "eslint" });
    const deploymentAgent = new DeploymentAgent({ name: "deployment" });

    await this.registerAgent("compatibility", compatibilityAgent);
    await this.registerAgent("eslint", eslintAgent);
    await this.registerAgent("deployment", deploymentAgent);

    // Register agents with orchestrator
    this.orchestrator.registerAgent(compatibilityAgent, ["VERSION_CHECK"]);
    this.orchestrator.registerAgent(eslintAgent, ["LINT_REQUEST"]);
    this.orchestrator.registerAgent(deploymentAgent, ["DEPLOYMENT_REQUEST"]);
  }

  /**
   * Register a new agent
   */
  public async registerAgent<T extends BaseAgentMessage>(name: string, agent: Agent<T>): Promise<void> {
    if (!agent) {
      throw new Error("Invalid agent");
    }

    if (this.agents.has(name)) {
      throw new Error(`Agent with name ${name} already exists`);
    }

    if (this.agents.size >= this.maxAgents) {
      throw new Error("Maximum number of agents reached");
    }

    this.agents.set(name, agent);
    this.lastHealthCheck.set(name, {
      name,
      state: agent.getState(),
      lastActive: agent.getLastActiveTime(),
    });
  }

  /**
   * Get an agent by name
   */
  public getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get the orchestrator agent
   */
  public getOrchestrator(): OrchestratorAgent {
    if (!this.orchestrator) {
      throw new Error("Orchestrator not initialized");
    }
    return this.orchestrator;
  }

  /**
   * Get health status of all agents
   */
  public getAgentHealth(): AgentHealth[] {
    return Array.from(this.lastHealthCheck.values());
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.agents.forEach((agent, name) => {
        this.lastHealthCheck.set(name, {
          name,
          state: agent.getState(),
          lastActive: agent.getLastActiveTime(),
        });
      });
    }, this.healthCheckInterval);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.agents.clear();
    this.lastHealthCheck.clear();
    this.orchestrator = null;
  }
} 