import { BaseAgentMessage, IMessageQueue, QueueItem } from "./types";

interface PriorityQueues<T extends BaseAgentMessage> {
  high: QueueItem<T>[];
  normal: QueueItem<T>[];
  low: QueueItem<T>[];
}

/**
 * Priority-based message queue implementation
 */
export class PriorityMessageQueue<T extends BaseAgentMessage> implements IMessageQueue<T> {
  private queues: PriorityQueues<T>;
  private _isProcessing: boolean;

  constructor() {
    this.queues = {
      high: [],
      normal: [],
      low: [],
    };
    this._isProcessing = false;
  }

  public async enqueue(message: T): Promise<void> {
    const queueItem: QueueItem<T> = {
      message,
      addedAt: Date.now(),
    };

    // Determine priority queue
    if (message.priority && message.priority > 5) {
      this.queues.high.push(queueItem);
    } else if (message.priority && message.priority > 2) {
      this.queues.normal.push(queueItem);
    } else {
      this.queues.low.push(queueItem);
    }

    // Sort queue by timestamp
    this.sortQueues();
  }

  public async dequeue(): Promise<T | undefined> {
    const item = this.dequeueItem();
    return item?.message;
  }

  public clear(): void {
    this.queues.high = [];
    this.queues.normal = [];
    this.queues.low = [];
  }

  private dequeueItem(): QueueItem<T> | undefined {
    // Try high priority queue first
    if (this.queues.high.length > 0) {
      return this.queues.high.shift();
    }

    // Then normal priority
    if (this.queues.normal.length > 0) {
      return this.queues.normal.shift();
    }

    // Finally low priority
    return this.queues.low.shift();
  }

  private sortQueues(): void {
    const sortByTimestamp = (a: QueueItem<T>, b: QueueItem<T>) => a.addedAt - b.addedAt;
    
    this.queues.high.sort(sortByTimestamp);
    this.queues.normal.sort(sortByTimestamp);
    this.queues.low.sort(sortByTimestamp);
  }

  public get size(): number {
    return (
      this.queues.high.length +
      this.queues.normal.length +
      this.queues.low.length
    );
  }

  public get isProcessing(): boolean {
    return this._isProcessing;
  }

  public set isProcessing(value: boolean) {
    this._isProcessing = value;
  }

  /**
   * Get current queue statistics
   */
  public getStats(): {
    total: number;
    high: number;
    normal: number;
    low: number;
  } {
    return {
      total: this.size,
      high: this.queues.high.length,
      normal: this.queues.normal.length,
      low: this.queues.low.length,
    };
  }
} 