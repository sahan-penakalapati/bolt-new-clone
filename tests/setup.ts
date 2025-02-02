import "@testing-library/jest-dom";
import { expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { BaseAgentMessage, AgentState } from "@/agents/types";

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Mock console methods to catch warnings and errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Helper functions for testing
export function createTestMessage<T = unknown>(
  type: string = "TEST",
  payload: T = {} as T,
  targetAgent: string = "test-agent"
): BaseAgentMessage {
  return {
    id: Math.random().toString(36).substring(7),
    type,
    payload,
    targetAgent,
    timestamp: Date.now(),
  };
}

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Enhanced timer management
export const advanceTimersToNextTimer = async () => {
  // Advance by a small increment to trigger the next timer
  await vi.advanceTimersByTimeAsync(50);
  // Ensure all promises are resolved
  await flushPromises();
};

// State transition verification
export async function verifyStateTransition(
  agent: { getState: () => AgentState },
  action: () => Promise<void>,
  expectedStates: AgentState[]
): Promise<void> {
  const states: AgentState[] = [agent.getState()];
  
  const stateObserver = vi.fn((state: AgentState) => {
    states.push(state);
  });

  // Create a proxy to observe state changes
  const originalGetState = agent.getState.bind(agent);
  vi.spyOn(agent, "getState").mockImplementation(() => {
    const state = originalGetState();
    stateObserver(state);
    return state;
  });

  try {
    await action();
  } catch (error) {
    // Expected errors during state transition testing
  }

  // Wait for any pending state changes
  await vi.runAllTimersAsync();
  await new Promise(resolve => setImmediate(resolve));

  // Remove duplicate consecutive states
  const uniqueStates = states.filter((state, index) => {
    return index === 0 || state !== states[index - 1];
  });

  expect(uniqueStates).toEqual(expectedStates);
}

// Enhanced waitFor with better timeout handling
export const waitFor = async (
  callback: () => void | Promise<void>,
  { timeout = 10000, interval = 50 } = {}
) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await callback();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, interval));
      await flushPromises();
    }
  }
  
  throw new Error(`Timed out after ${timeout}ms`);
};

// Helper to run timers and flush promises
export async function advanceAndFlush(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  // Ensure all microtasks are processed
  await new Promise(resolve => setImmediate(resolve));
} 