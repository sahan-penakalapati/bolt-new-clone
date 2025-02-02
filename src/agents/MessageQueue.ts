import { BaseAgentMessage } from "./types";
import { AgentError, AgentErrorType } from "./utils";

export class MessageQueue {
  private queue: BaseAgentMessage[] = [];
  private processing: boolean = false;
  private maxSize: number;
  private processCallback: (message: BaseAgentMessage) => Promise<void>;

  constructor(
    processCallback: (message: BaseAgentMessage) => Promise<void>,
    maxSize: number = 100
  ) {
    this.processCallback = processCallback;
    this.maxSize = maxSize;
  }

  /**
   * Get the current size of the queue
   */
  public get size(): number {
    return this.queue.length;
  }

  /**
   * Get the current length of the queue (alias for size)
   */
  public get length(): number {
    return this.size;
  }

  /**
   * Check if the queue is currently processing a message
   */
  public get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Add a message to the queue and start processing if not already processing
   */
  public async enqueue(message: BaseAgentMessage): Promise<void> {
    if (this.queue.length >= this.maxSize) {
      throw new AgentError(
        AgentErrorType.QUEUE_FULL,
        "Queue is full"
      );
    }

    // Insert message in priority order (higher priority first)
    // For messages with same priority, maintain FIFO order
    const priority = message.priority ?? 0;
    const insertIndex = this.queue.findIndex(m => (m.priority ?? 0) < priority);
    
    if (insertIndex === -1) {
      // Append to the end of messages with same priority
      const lastSamePriorityIndex = this.queue.findLastIndex(m => (m.priority ?? 0) === priority);
      if (lastSamePriorityIndex === -1) {
        this.queue.push(message);
      } else {
        this.queue.splice(lastSamePriorityIndex + 1, 0, message);
      }
    } else {
      this.queue.splice(insertIndex, 0, message);
    }

    // Start processing if not already processing
    if (!this.processing) {
      await this.processNextMessage();
    }
  }

  /**
   * Get the next message from the queue
   */
  public async dequeue(): Promise<BaseAgentMessage | undefined> {
    if (this.queue.length === 0) {
      return undefined;
    }
    return this.queue.shift();
  }

  /**
   * Clear all messages from the queue
   */
  public clear(): void {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Set the processing state
   */
  public setProcessing(state: boolean): void {
    this.processing = state;
  }

  /**
   * Process the next message in the queue
   */
  private async processNextMessage(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const message = await this.dequeue();

    if (message) {
      try {
        await this.processCallback(message);
      } catch (error) {
        this.processing = false;
        throw error;
      }
    }

    // Process next message if any
    await this.processNextMessage();
  }
} 