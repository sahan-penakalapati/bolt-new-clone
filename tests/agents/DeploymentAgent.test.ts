import { describe, it, expect, beforeEach, afterEach, vi, SpyInstance } from "vitest";
import { DeploymentAgent } from "@/agents/DeploymentAgent";
import { createTestMessage } from "../setup";
import { MESSAGE_TYPES } from "@/agents";
import { DeploymentMessage, DeploymentConfig } from "../../src/agents/types";
import { AgentError, AgentErrorType } from "../../src/agents/utils";

interface DeploymentPayload {
  projectPath: string;
  buildConfig?: {
    base?: string;
    outDir?: string;
    minify?: boolean;
    sourcemap?: boolean;
  };
}

describe("DeploymentAgent", () => {
  let agent: DeploymentAgent;
  let consoleSpy: SpyInstance;
  const config: DeploymentConfig = {
    timeoutMs: 5000,
    buildTimeout: 3000,
    name: "test-deployment-agent",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    consoleSpy = vi.spyOn(console, "log");
    agent = new DeploymentAgent(config);
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  const createTestMessage = (
    projectPath: string = "test-project",
    buildConfig?: Record<string, unknown>
  ): DeploymentMessage => ({
    type: "DEPLOYMENT_REQUEST",
    targetAgent: "deployment-agent",
    payload: {
      projectPath,
      buildConfig,
    },
  });

  describe("build process", () => {
    it("should handle successful builds", async () => {
      const message = createTestMessage();
      await agent.processMessage(message);
      const build = agent.getCurrentBuild();
      expect(build).toBeTruthy();
      expect(build?.status).toBe("success");
      expect(build?.duration).toBeGreaterThan(0);
      expect(build?.artifacts).toHaveLength(3);
    });

    it("should respect build timeout", async () => {
      const message = createTestMessage();
      const shortTimeoutAgent = new DeploymentAgent({
        ...config,
        buildTimeout: 1,
      });

      await expect(shortTimeoutAgent.processMessage(message)).rejects.toThrow(
        "build process timed out"
      );
    });

    it("should handle custom build config", async () => {
      const message = createTestMessage("test-project", {
        base: "/app",
        outDir: "build",
        minify: true,
        sourcemap: true,
      });

      await agent.processMessage(message);
      const build = agent.getCurrentBuild();
      expect(build?.status).toBe("success");
    });

    it("should track failed builds", async () => {
      // Mock Math.random to force a build failure
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.05);

      const message = createTestMessage();
      await expect(agent.processMessage(message)).rejects.toThrow("Random build failure");

      const build = agent.getCurrentBuild();
      expect(build?.status).toBe("failed");
      expect(build?.errors).toHaveLength(1);
      expect(build?.errors?.[0]).toBe("Random build failure");

      Math.random = originalRandom;
    });

    it("should handle missing project path", async () => {
      const message = createTestMessage("");
      await expect(agent.processMessage(message)).rejects.toThrow(
        "Project path is required"
      );
    });

    it("should validate message type", async () => {
      const invalidMessage = {
        type: "INVALID_TYPE",
        targetAgent: "deployment-agent",
        payload: {
          projectPath: "test-project",
        },
      };

      await expect(agent.processMessage(invalidMessage as DeploymentMessage)).rejects.toThrow(
        "Invalid message type"
      );
    });
  });

  describe("build status tracking", () => {
    it("should track build status correctly", async () => {
      const message = createTestMessage();
      const processPromise = agent.processMessage(message);
      expect(agent.getCurrentBuild()?.status).toBe("building");

      await vi.advanceTimersByTimeAsync(1000);
      expect(agent.getCurrentBuild()?.status).toBe("building");

      await vi.advanceTimersByTimeAsync(1000);
      await processPromise;
      expect(agent.getCurrentBuild()?.status).toBe("success");
    });

    it("should track failed builds", async () => {
      const message = createTestMessage();

      // Mock build failure
      vi.spyOn(Math, "random").mockReturnValue(0.95);

      const processPromise = agent.processMessage(message);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(processPromise).rejects.toThrow();
      expect(agent.getCurrentBuild()?.status).toBe("failed");
    });
  });

  describe("error handling", () => {
    it("should handle invalid message types", async () => {
      const message = createTestMessage("INVALID_TYPE", {
        projectPath: "/test/project",
      });

      await expect(agent.processMessage(message)).rejects.toThrow(
        "Unsupported message type"
      );
    });

    it("should handle missing project path", async () => {
      const message = createTestMessage("");

      const processPromise = agent.processMessage(message);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(processPromise).rejects.toThrow();
    });
  });
}); 