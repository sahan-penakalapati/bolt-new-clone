import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AgentRegistry } from "@/agents/AgentRegistry";
import { BaseAgent } from "@/agents/BaseAgent";
import { AgentState } from "@/agents/types";
import type { BaseAgentMessage } from "@/agents/types";
import { AgentConfig } from "@/agents/BaseAgent";
import { createTestMessage } from "../setup";

// Create a test agent for registry testing
class TestAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  public async processMessage(message: BaseAgentMessage): Promise<void> {
    // Test implementation
  }

  protected async sendMessage(): Promise<void> {
    // Not used in tests
  }
}

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    registry = AgentRegistry.getInstance({
      maxAgents: 3,
      healthCheckIntervalMs: 100,
    });
  });

  afterEach(() => {
    registry.dispose();
    // Reset the singleton instance
    (AgentRegistry as any).instance = undefined;
    vi.useRealTimers();
  });

  describe("singleton pattern", () => {
    it("should maintain a single instance", () => {
      const instance1 = AgentRegistry.getInstance();
      const instance2 = AgentRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should use provided config on first instantiation", () => {
      // Reset singleton first
      (AgentRegistry as any).instance = undefined;

      const registry = AgentRegistry.getInstance({
        maxAgents: 5,
        healthCheckIntervalMs: 200,
      });
      expect(registry["maxAgents"]).toBe(5);
      expect(registry["healthCheckInterval"]).toBe(200);
    });
  });

  describe("agent registration", () => {
    it("should register agents successfully", async () => {
      const agent = new TestAgent({ name: "test-agent" });
      await registry.registerAgent("test", agent);
      expect(registry.getAgent("test")).toBe(agent);
    });

    it("should prevent duplicate agent names", async () => {
      const registry = AgentRegistry.getInstance();
      const agent = new TestAgent({ name: "test" });
      await registry.registerAgent("test", agent);
      await expect(registry.registerAgent("test", new TestAgent({ name: "test" }))).rejects.toThrow(
        "Agent with name test already exists"
      );
    });

    it("should enforce maximum agent limit", async () => {
      const registry = AgentRegistry.getInstance({ maxAgents: 1 });
      const agent1 = new TestAgent({ name: "test1" });
      const agent2 = new TestAgent({ name: "test2" });
      await registry.registerAgent("test1", agent1);
      await expect(registry.registerAgent("test2", agent2)).rejects.toThrow(
        "Maximum number of agents reached"
      );
    });
  });

  describe("core agents initialization", () => {
    it("should initialize core agents", async () => {
      await registry.initializeCoreAgents();
      
      expect(registry.getAgent("compatibility")).toBeDefined();
      expect(registry.getAgent("eslint")).toBeDefined();
      expect(registry.getAgent("deployment")).toBeDefined();
    });

    it("should register core agents with orchestrator", async () => {
      await registry.initializeCoreAgents();
      
      const orchestrator = registry.getOrchestrator();
      expect(orchestrator).toBeDefined();
      
      // Test message routing through orchestrator
      const message = createTestMessage("VERSION_CHECK", {
        viteVersion: "5.0.0",
      });
      
      await expect(orchestrator.processMessage(message)).resolves.not.toThrow();
    });
  });

  describe("health monitoring", () => {
    it("should track agent health status", async () => {
      const agent = new TestAgent({ name: "health-test" });
      await registry.registerAgent("health-test", agent);

      const health = registry.getAgentHealth();
      expect(health).toContainEqual(
        expect.objectContaining({
          name: "health-test",
          state: AgentState.IDLE,
        })
      );
    });

    it("should detect unhealthy agents", async () => {
      const agent = new TestAgent({ name: "error-test" });
      await registry.registerAgent("error-test", agent);

      // Simulate error state
      agent["state"] = AgentState.ERROR;

      const health = registry.getAgentHealth();
      const agentHealth = health.find(h => h.name === "error-test");
      expect(agentHealth?.state).toBe(AgentState.ERROR);
    });

    it("should clean up health check timer on dispose", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      registry.dispose();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle agent registration errors", async () => {
      const registry = AgentRegistry.getInstance();
      await expect(registry.registerAgent("invalid", undefined as any)).rejects.toThrow(
        "Invalid agent"
      );
    });

    it("should handle agent retrieval for non-existent agents", () => {
      expect(registry.getAgent("non-existent")).toBeUndefined();
    });
  });

  describe("resource cleanup", () => {
    it("should clear all agents on dispose", async () => {
      const agent = new TestAgent({ name: "cleanup-test" });
      await registry.registerAgent("cleanup", agent);
      
      registry.dispose();
      expect(registry.getAgent("cleanup")).toBeUndefined();
    });

    it("should stop health checks on dispose", () => {
      const initialTimer = registry["healthCheckTimer"];
      expect(initialTimer).toBeDefined();

      registry.dispose();
      expect(registry["healthCheckTimer"]).toBeNull();
    });
  });
}); 