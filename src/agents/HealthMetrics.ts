import { AgentState } from "./types";
import { CircuitState } from "./CircuitBreaker";

/**
 * Health check result type
 */
export interface HealthCheckResult {
  healthy: boolean;
  status: AgentState;
  circuitState: CircuitState;
  lastCheck: number;
  metrics: HealthMetricsData;
}

/**
 * Health metrics data
 */
export interface HealthMetricsData {
  messageCount: number;
  errorCount: number;
  successRate: number;
  avgProcessingTime: number;
  lastProcessingTime: number;
  lastErrorTime: number;
  lastSuccessTime: number;
}

/**
 * Health metrics collector for agents
 */
export class HealthMetrics {
  private messageCount: number = 0;
  private errorCount: number = 0;
  private processingTimes: number[] = [];
  private readonly maxSamples: number = 100;
  private lastProcessingTime: number = 0;
  private lastErrorTime: number = 0;
  private lastSuccessTime: number = 0;

  /**
   * Record a successful message processing
   */
  public recordSuccess(processingTime: number): void {
    this.messageCount++;
    this.lastProcessingTime = processingTime;
    this.lastSuccessTime = Date.now();
    this.addProcessingTime(processingTime);
  }

  /**
   * Record a failed message processing
   */
  public recordError(processingTime: number): void {
    this.messageCount++;
    this.errorCount++;
    this.lastProcessingTime = processingTime;
    this.lastErrorTime = Date.now();
    this.addProcessingTime(processingTime);
  }

  /**
   * Get current health metrics
   */
  public getMetrics(): HealthMetricsData {
    const successRate = this.messageCount > 0
      ? ((this.messageCount - this.errorCount) / this.messageCount) * 100
      : 100;

    const avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      successRate,
      avgProcessingTime,
      lastProcessingTime: this.lastProcessingTime,
      lastErrorTime: this.lastErrorTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Reset metrics
   */
  public reset(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.processingTimes = [];
    this.lastProcessingTime = 0;
    this.lastErrorTime = 0;
    this.lastSuccessTime = 0;
  }

  private addProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > this.maxSamples) {
      this.processingTimes.shift();
    }
  }
} 