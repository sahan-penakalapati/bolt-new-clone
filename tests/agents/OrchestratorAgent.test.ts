import { describe, it, expect, beforeEach, afterEach, vi, SpyInstance } from "vitest";
import { BaseAgent } from "@/agents/BaseAgent";
import { AgentState } from "@/agents/types";
import type { BaseAgentMessage } from "@/agents/types";
import { OrchestratorAgent } from "@/agents/OrchestratorAgent";
import { createTestMessage, waitFor, verifyStateTransition } from "../setup";

// Create a test agent that tracks received messages
class TestReceiverAgent extends BaseAgent {
  public receivedMessages: BaseAgentMessage[] = [];

  public async processMessage(message: BaseAgentMessage): Promise<void> {
    this.receivedMessages.push(message);
  }

  protected async sendMessage(): Promise<void> {
    // Not used in this test
  }
}

describe("OrchestratorAgent", () => {
  let orchestrator: OrchestratorAgent;
  let receiverAgent: TestReceiverAgent;
  let consoleSpy: SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    consoleSpy = vi.spyOn(console, "log");
    orchestrator = new OrchestratorAgent({
      name: "test-orchestrator",
      maxRetries: 2,
    });

    receiverAgent = new TestReceiverAgent({
      name: "test-receiver",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  describe("agent registration", () => {
    it("should register agents for message types", () => {
      orchestrator.registerAgent(receiverAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("TEST_TYPE", undefined, "test-receiver");
      return expect(orchestrator.processMessage(message)).resolves.not.toThrow();
    });

    it("should allow multiple agents for same message type", () => {
      const secondReceiver = new TestReceiverAgent({
        name: "second-receiver",
      });

      orchestrator.registerAgent(receiverAgent, ["TEST_TYPE"]);
      orchestrator.registerAgent(secondReceiver, ["TEST_TYPE"]);

      const message = createTestMessage("TEST_TYPE", undefined, "test-receiver");
      return expect(orchestrator.processMessage(message)).resolves.not.toThrow();
    });
  });

  describe("message routing", () => {
    it("should route messages to registered agents", async () => {
      orchestrator.registerAgent(receiverAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("TEST_TYPE", { data: "test" }, "test-receiver");
      await orchestrator.processMessage(message);

      expect(receiverAgent.receivedMessages).toHaveLength(1);
      expect(receiverAgent.receivedMessages[0]).toEqual(message);
    });

    it("should not route messages to unregistered types", async () => {
      orchestrator.registerAgent(receiverAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("UNKNOWN_TYPE", undefined, "test-receiver");
      await orchestrator.processMessage(message);

      expect(receiverAgent.receivedMessages).toHaveLength(0);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should retry failed deliveries", async () => {
      let attempts = 0;
      const failingAgent = new class extends TestReceiverAgent {
        public async processMessage(): Promise<void> {
          attempts++;
          if (attempts === 1) {
            throw new Error("First attempt fails");
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }({ name: "failing-agent" });

      orchestrator.registerAgent(failingAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("TEST_TYPE", undefined, "failing-agent");
      await expect(orchestrator.processMessage(message)).resolves.not.toThrow();
      
      // Advance timers to handle retry
      await vi.advanceTimersByTimeAsync(1000);
      expect(attempts).toBe(2);
      expect(failingAgent.getState()).toBe(AgentState.IDLE);
    });

    it("should handle state transitions during retries", async () => {
      let attempts = 0;
      const failingAgent = new class extends TestReceiverAgent {
        public async processMessage(): Promise<void> {
          attempts++;
          if (attempts <= 2) {
            throw new Error(`Attempt ${attempts} fails`);
          }
        }
      }({ name: "failing-agent" });

      orchestrator.registerAgent(failingAgent, ["TEST_TYPE"]);
      const message = createTestMessage("TEST_TYPE", undefined, "failing-agent");

      await verifyStateTransition(
        failingAgent,
        async () => {
          try {
            await orchestrator.processMessage(message);
          } catch (error) {
            // Expected error
          }
          // Advance timers for retries
          await vi.advanceTimersByTimeAsync(1000);
          await vi.advanceTimersByTimeAsync(1000);
        },
        [AgentState.IDLE, AgentState.ERROR, AgentState.IDLE]
      );
    });

    it("should handle agent in ERROR state", async () => {
      const errorAgent = new TestReceiverAgent({ name: "error-agent" });
      errorAgent["state"] = AgentState.ERROR;

      orchestrator.registerAgent(errorAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("TEST_TYPE", undefined, "error-agent");
      await expect(orchestrator.processMessage(message)).rejects.toThrow();
    });

    it("should respect max retries", async () => {
      let attempts = 0;
      const failingAgent = new class extends TestReceiverAgent {
        public async processMessage(): Promise<void> {
          attempts++;
          throw new Error("Always fails");
        }
      }({ name: "failing-agent" });

      orchestrator.registerAgent(failingAgent, ["TEST_TYPE"]);
      
      const message = createTestMessage("TEST_TYPE", undefined, "failing-agent");
      const processPromise = orchestrator.processMessage(message);
      
      // Wait for all retries
      await vi.advanceTimersByTimeAsync(300);
      await expect(processPromise).rejects.toThrow();
      expect(attempts).toBe(3); // Initial attempt + 2 retries
    });
  });

  describe("concurrent message handling", () => {
    it("should process messages in order", async () => {
      const messages = [
        createTestMessage("TEST_TYPE", { id: 1 }, "ordered-agent"),
        createTestMessage("TEST_TYPE", { id: 2 }, "ordered-agent"),
        createTestMessage("TEST_TYPE", { id: 3 }, "ordered-agent")
      ];

      const processedIds: number[] = [];
      const orderedAgent = new class extends TestReceiverAgent {
        public async processMessage(message: BaseAgentMessage): Promise<void> {
          processedIds.push((message.payload as any).id);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }({ name: "ordered-agent" });

      orchestrator.registerAgent(orderedAgent, ["TEST_TYPE"]);
      
      await Promise.all(messages.map(msg => orchestrator.processMessage(msg)));
      await vi.advanceTimersByTimeAsync(100);
      
      expect(processedIds).toEqual([1, 2, 3]);
    });
  });
}); 