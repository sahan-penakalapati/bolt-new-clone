import { describe, it, expect, beforeEach, afterEach, vi, SpyInstance } from "vitest";
import { CompatibilityAgent } from "@/agents/CompatibilityAgent";
import { createTestMessage } from "../setup";
import { MESSAGE_TYPES } from "@/agents";

interface VersionMatrix {
  [key: string]: {
    vite: string[];
    react: string[];
    nextjs: string[];
  };
}

describe("CompatibilityAgent", () => {
  let agent: CompatibilityAgent;
  let consoleSpy: SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    consoleSpy = vi.spyOn(console, "log");
    agent = new CompatibilityAgent({
      name: "compatibility",
      versionMatrix: {
        stable: {
          vite: ["5.x"],
          react: ["18.x"],
          nextjs: ["14.x"],
        },
        latest: {
          vite: ["5.x", "6.x"],
          react: ["18.x", "19.x"],
          nextjs: ["14.x", "15.x"],
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleSpy.mockRestore();
  });

  describe("version compatibility checks", () => {
    it("should validate compatible versions", async () => {
      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "5.0.0",
        reactVersion: "18.2.0",
        nextjsVersion: "14.0.0",
      });

      await agent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: true,
          recommendations: undefined,
        })
      );
    });

    it("should identify incompatible versions", async () => {
      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "4.0.0",
        reactVersion: "17.0.0",
        nextjsVersion: "13.0.0",
      });

      await agent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: false,
          recommendations: expect.arrayContaining([
            expect.stringContaining("Vite version 4.0.0 is not supported"),
            expect.stringContaining("React version 17.0.0 is not supported"),
            expect.stringContaining("Next.js version 13.0.0 is not supported"),
          ]),
        })
      );
    });

    it("should handle partial version checks", async () => {
      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "5.0.0",
        // Only checking Vite version
      });

      await agent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: true,
          recommendations: undefined,
        })
      );
    });

    it("should handle latest versions", async () => {
      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "6.0.0",
        reactVersion: "19.0.0",
        nextjsVersion: "15.0.0",
      });

      await agent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: true,
          recommendations: undefined,
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle invalid message types", async () => {
      const message = createTestMessage("INVALID_TYPE", {});
      await expect(agent.processMessage(message)).rejects.toThrow("Unsupported message type");
    });

    it("should handle malformed version strings", async () => {
      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "invalid",
        reactVersion: "not.a.version",
      });

      await agent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: false,
          recommendations: expect.arrayContaining([
            expect.stringContaining("Vite version invalid is not supported"),
            expect.stringContaining("React version not.a.version is not supported"),
          ]),
        })
      );
    });
  });

  describe("version matrix management", () => {
    it("should use default matrix when not provided", () => {
      const defaultAgent = new CompatibilityAgent({ name: "default-matrix" });
      expect(defaultAgent["versionMatrix"]).toBeDefined();
      expect(defaultAgent["versionMatrix"].stable).toBeDefined();
      expect(defaultAgent["versionMatrix"].latest).toBeDefined();
    });

    it("should handle custom version matrix", async () => {
      const customAgent = new CompatibilityAgent({
        name: "custom-matrix",
        versionMatrix: {
          stable: {
            vite: ["4.x", "5.x"],
            react: ["17.x", "18.x"],
            nextjs: ["13.x", "14.x"],
          },
          latest: {
            vite: ["4.x", "5.x", "6.x"],
            react: ["17.x", "18.x", "19.x"],
            nextjs: ["13.x", "14.x", "15.x"],
          },
        },
      });

      const message = createTestMessage(MESSAGE_TYPES.VERSION_CHECK, {
        viteVersion: "4.5.0",
        reactVersion: "17.0.2",
        nextjsVersion: "13.4.0",
      });

      await customAgent.processMessage(message);
      await vi.runAllTimersAsync();

      expect(console.log).toHaveBeenCalledWith(
        "Version check result:",
        expect.objectContaining({
          compatible: true,
          recommendations: undefined,
        })
      );
    });
  });
}); 