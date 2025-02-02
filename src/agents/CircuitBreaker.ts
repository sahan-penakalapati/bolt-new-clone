import { AgentError, AgentErrorType } from "./utils";

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation
  OPEN = "OPEN",        // Failed state, rejecting requests
  HALF_OPEN = "HALF_OPEN" // Testing if service has recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenTimeout: number;
}

/**
 * Circuit breaker for managing agent health states
 */
export class CircuitBreaker {
  private state: CircuitState;
  private failures: number;
  private lastFailureTime: number;
  private lastStateChange: number;

  constructor(private config: CircuitBreakerConfig) {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  public async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    await this.checkState();

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw new AgentError(
        AgentErrorType.OPERATION,
        `Circuit breaker: ${context} failed`,
        error
      );
    }
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  public getFailureCount(): number {
    return this.failures;
  }

  /**
   * Check and potentially update circuit state
   */
  private async checkState(): Promise<void> {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.OPEN:
        if (now - this.lastStateChange >= this.config.resetTimeout) {
          this.transitionTo(CircuitState.HALF_OPEN);
        } else {
          throw new AgentError(
            AgentErrorType.OPERATION,
            "Circuit breaker is OPEN",
            { remainingTimeout: this.config.resetTimeout - (now - this.lastStateChange) }
          );
        }
        break;

      case CircuitState.HALF_OPEN:
        if (now - this.lastStateChange >= this.config.halfOpenTimeout) {
          this.transitionTo(CircuitState.CLOSED);
        }
        break;

      case CircuitState.CLOSED:
        // Normal operation, continue
        break;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.CLOSED);
    }
    this.failures = 0;
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.failures = 0;
    }
  }

  /**
   * Reset the circuit breaker to its initial state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): {
    state: CircuitState;
    failures: number;
    lastFailureTime: number;
    lastStateChange: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }
} 