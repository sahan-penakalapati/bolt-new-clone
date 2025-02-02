import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MessageQueue, AgentMessage } from "@/agents";
import { createTestMessage } from "../setup";

interface TestPayload {
  priority?: number;
  id?: number;
}

describe("MessageQueue", () => {
  let queue: MessageQueue;
  let processCallback: (message: AgentMessage) => Promise<void>;

  beforeEach(() => {
    vi.useFakeTimers();
    processCallback = vi.fn().mockResolvedValue(undefined);
    queue = new MessageQueue(processCallback);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("message enqueueing", () => {
    it("should process messages in priority order", async () => {
      const processedMessages: number[] = [];
      processCallback = vi.fn().mockImplementation(async (message: AgentMessage) => {
        const payload = message.payload as TestPayload;
        processedMessages.push(payload.priority ?? 0);
        await vi.advanceTimersByTimeAsync(10);
      });

      queue = new MessageQueue(processCallback);

      // Enqueue messages with different priorities
      await queue.enqueue(createTestMessage<TestPayload>("TEST", { priority: 1 }));
      await queue.enqueue(createTestMessage<TestPayload>("TEST", { priority: 3 }));
      await queue.enqueue(createTestMessage<TestPayload>("TEST", { priority: 2 }));

      // Wait for all messages to be processed
      await vi.runAllTimersAsync();

      expect(processedMessages).toEqual([3, 2, 1]);
    });

    it("should respect queue size limits", async () => {
      const smallQueue = new MessageQueue(processCallback, 2);

      await smallQueue.enqueue(createTestMessage<TestPayload>("TEST"));
      await smallQueue.enqueue(createTestMessage<TestPayload>("TEST"));

      await expect(async () => {
        await smallQueue.enqueue(createTestMessage<TestPayload>("TEST"));
      }).rejects.toThrow("Queue is full");
    });
  });

  describe("queue processing", () => {
    it("should process all messages", async () => {
      const messages = [
        createTestMessage<TestPayload>("TEST", { id: 1 }),
        createTestMessage<TestPayload>("TEST", { id: 2 }),
        createTestMessage<TestPayload>("TEST", { id: 3 }),
      ];

      await Promise.all(messages.map(msg => queue.enqueue(msg)));
      await vi.runAllTimersAsync();

      expect(processCallback).toHaveBeenCalledTimes(3);
      expect(queue.size).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      processCallback = vi.fn()
        .mockRejectedValueOnce(new Error("Processing failed"))
        .mockResolvedValue(undefined);

      queue = new MessageQueue(processCallback);

      await expect(async () => {
        await queue.enqueue(createTestMessage<TestPayload>("TEST"));
      }).rejects.toThrow("Processing failed");

      // Queue should still be able to process new messages
      await queue.enqueue(createTestMessage<TestPayload>("TEST"));
      await vi.runAllTimersAsync();

      expect(processCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("queue management", () => {
    it("should clear the queue", async () => {
      await queue.enqueue(createTestMessage<TestPayload>("TEST"));
      await queue.enqueue(createTestMessage<TestPayload>("TEST"));

      queue.clear();
      expect(queue.size).toBe(0);
    });

    it("should track processing state", async () => {
      processCallback = vi.fn().mockImplementation(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      queue = new MessageQueue(processCallback);
      const enqueuePromise = queue.enqueue(createTestMessage<TestPayload>("TEST"));

      expect(queue.isProcessing).toBe(true);
      await enqueuePromise;
      await vi.runAllTimersAsync();
      expect(queue.isProcessing).toBe(false);
    });
  });
}); 