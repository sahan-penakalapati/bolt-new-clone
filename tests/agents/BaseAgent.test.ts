import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BaseAgent, AgentState, BaseAgentMessage } from "@/agents/BaseAgent";
import { createTestMessage, advanceAndFlush, verifyStateTransition } from "../setup";

// Configure longer test timeout
const TEST_TIMEOUT = 30000;

// Create a concrete implementation of BaseAgent for testing
class TestAgent extends BaseAgent {
  public messageProcessed = false;
  public messageSent = false;

  public async processMessage(message: BaseAgentMessage): Promise<void> {
    this.messageProcessed = true;
    await this.mockProcessing();
  }

  protected async sendMessage(message: BaseAgentMessage): Promise<void> {
    this.messageSent = true;
    await this.mockProcessing();
  }

  protected async mockProcessing(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }

  // Expose protected methods for testing
  public exposeEnqueueMessage(message: BaseAgentMessage): Promise<void> {
    return this.enqueueMessage(message);
  }

  public exposeProcessNextMessage(): Promise<void> {
    return this.processNextMessage();
  }
}

describe("BaseAgent", () => {
  let agent: TestAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    agent = new TestAgent({ name: "test-agent" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with correct default state", () => {
      expect(agent.getState()).toBe(AgentState.IDLE);
    });

    it("should initialize with correct config defaults", () => {
      expect(agent["config"].maxConcurrentTasks).toBe(1);
      expect(agent["config"].timeoutMs).toBe(30000);
    });
  });

  describe("state management", () => {
    it("should transition states correctly during message processing", async () => {
      const message = createTestMessage("TEST");
      
      await verifyStateTransition(
        agent,
        async () => {
          await agent.exposeEnqueueMessage(message);
          const processPromise = agent.exposeProcessNextMessage();
          await advanceAndFlush(20);
          await processPromise;
        },
        [AgentState.IDLE, AgentState.WORKING, AgentState.IDLE]
      );
    }, { timeout: TEST_TIMEOUT });

    it("should handle errors and transition to ERROR state", async () => {
      const errorAgent = new class extends TestAgent {
        public async processMessage(): Promise<void> {
          await this.mockProcessing();
          throw new Error("Test error");
        }
      }({ name: "error-agent" });

      await verifyStateTransition(
        errorAgent,
        async () => {
          const message = createTestMessage("TEST");
          await errorAgent.exposeEnqueueMessage(message);
          try {
            await errorAgent.exposeProcessNextMessage();
          } catch (error) {
            // Expected error
          }
        },
        [AgentState.IDLE, AgentState.WORKING, AgentState.ERROR]
      );
    }, { timeout: TEST_TIMEOUT });
  });

  describe("message queue", () => {
    it("should process messages in FIFO order", async () => {
      const processedMessages: string[] = [];
      const processingAgent = new class extends TestAgent {
        public async processMessage(message: BaseAgentMessage): Promise<void> {
          processedMessages.push(message.id);
          await this.mockProcessing();
        }
      }({ name: "queue-agent" });

      const messages = [
        createTestMessage("TEST1"),
        createTestMessage("TEST2"),
        createTestMessage("TEST3"),
      ];

      // Store message IDs before processing
      const expectedOrder = messages.map(m => m.id);

      // Enqueue messages sequentially
      for (const msg of messages) {
        await processingAgent.exposeEnqueueMessage(msg);
      }
      
      // Process all messages
      for (let i = 0; i < messages.length; i++) {
        await processingAgent.exposeProcessNextMessage();
        await advanceAndFlush(20);
      }

      expect(processedMessages).toEqual(expectedOrder);
    }, { timeout: TEST_TIMEOUT });

    it("should clear queue on emergency stop", async () => {
      const messages = [
        createTestMessage("TEST1"),
        createTestMessage("TEST2"),
      ];

      for (const msg of messages) {
        await agent.exposeEnqueueMessage(msg);
      }
      agent.emergencyStop();

      expect(agent["messageQueue"].length).toBe(0);
      expect(agent.getState()).toBe(AgentState.IDLE);
    }, { timeout: TEST_TIMEOUT });
  });

  describe("error handling", () => {
    it("should handle timeout errors", async () => {
      const timeoutAgent = new class extends TestAgent {
        public async processMessage(): Promise<void> {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }({ 
        name: "timeout-agent",
        timeoutMs: 100,
      });

      await verifyStateTransition(
        timeoutAgent,
        async () => {
          const message = createTestMessage("TEST");
          await timeoutAgent.exposeEnqueueMessage(message);
          try {
            const processPromise = timeoutAgent.exposeProcessNextMessage();
            await advanceAndFlush(150);
            await processPromise;
          } catch (error) {
            // Expected timeout error
          }
        },
        [AgentState.IDLE, AgentState.WORKING, AgentState.ERROR]
      );
    }, { timeout: TEST_TIMEOUT });

    it("should recover from ERROR state on successful processing", async () => {
      let shouldFail = true;
      const recoveryAgent = new class extends TestAgent {
        public async processMessage(): Promise<void> {
          await this.mockProcessing();
          if (shouldFail) {
            shouldFail = false;
            throw new Error("Temporary error");
          }
        }
      }({ name: "recovery-agent" });

      // First message fails
      const message1 = createTestMessage("TEST1");
      await recoveryAgent.exposeEnqueueMessage(message1);
      try {
        await recoveryAgent.exposeProcessNextMessage();
      } catch (error) {
        // Expected error
      }
      expect(recoveryAgent.getState()).toBe(AgentState.ERROR);

      // Second message succeeds and recovers
      const message2 = createTestMessage("TEST2");
      await recoveryAgent.exposeEnqueueMessage(message2);
      await recoveryAgent.exposeProcessNextMessage();
      await advanceAndFlush(20);
      expect(recoveryAgent.getState()).toBe(AgentState.IDLE);
    }, { timeout: TEST_TIMEOUT });
  });
}); 