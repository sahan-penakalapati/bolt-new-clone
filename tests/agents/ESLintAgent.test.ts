import { describe, it, expect, beforeEach, afterEach, vi, SpyInstance } from "vitest";
import { ESLintAgent } from "@/agents/ESLintAgent";
import { AgentMessage, AgentState } from "@/agents/BaseAgent";
import { createTestMessage, verifyStateTransition } from "../setup";
import { MESSAGE_TYPES } from "@/agents";

interface LintPayload {
  code: string;
  filePath: string;
  autoFix?: boolean;
}

describe("ESLintAgent", () => {
  let agent: ESLintAgent;
  let consoleSpy: SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log");
    agent = new ESLintAgent({
      name: "test-eslint",
      autoFixEnabled: true,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("linting", () => {
    it("should detect and report errors", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1;",
        filePath: "test.ts",
      });

      await agent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "no-var",
              severity: 2,
              message: expect.stringContaining("var"),
            }),
          ]),
          warnings: [],
        })
      );
    });

    it("should detect and report warnings", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "if (x == y) {}",
        filePath: "test.ts",
      });

      await agent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: false,
          errors: [],
          warnings: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "eqeqeq",
              severity: 1,
              message: expect.stringContaining("==="),
            }),
          ]),
        })
      );
    });

    it("should handle clean code", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "const x: number = 1;",
        filePath: "test.ts",
      });

      await agent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: false,
          errors: [],
          warnings: [],
        })
      );
    });
  });

  describe("auto-fixing", () => {
    it("should auto-fix code when enabled", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1;",
        filePath: "test.ts",
        autoFix: true,
      });

      await agent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: true,
          fixedCode: "const x = 1;",
          errors: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "no-var",
              severity: 2,
            }),
          ]),
        })
      );
    });

    it("should not auto-fix when disabled", async () => {
      const noAutoFixAgent = new ESLintAgent({
        name: "no-autofix-eslint",
        autoFixEnabled: false,
      });

      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1;",
        filePath: "test.ts",
        autoFix: true,
      });

      await noAutoFixAgent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "no-var",
              severity: 2,
            }),
          ]),
        })
      );
    });

    it("should apply multiple fixes in correct order", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1; if (x == 2) {}",
        filePath: "test.ts",
        autoFix: true,
      });

      await agent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: true,
          fixedCode: "const x = 1; if (x === 2) {}",
          errors: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "no-var",
              severity: 2,
            }),
          ]),
          warnings: expect.arrayContaining([
            expect.objectContaining({
              ruleId: "eqeqeq",
              severity: 1,
            }),
          ]),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle invalid code gracefully", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "const x =",  // Invalid syntax
        filePath: "test.ts",
      });

      await verifyStateTransition(
        agent,
        async () => {
          await agent.processMessage(message);
        },
        [AgentState.IDLE, AgentState.ERROR, AgentState.IDLE]
      );
    });

    it("should recover from parser errors", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "function() { return 1; }",  // Invalid function declaration
        filePath: "test.ts",
      });

      await verifyStateTransition(
        agent,
        async () => {
          try {
            await agent.processMessage(message);
          } catch (error) {
            // Error expected, agent should auto-recover
            await vi.advanceTimersByTimeAsync(100);
          }
        },
        [AgentState.IDLE, AgentState.ERROR, AgentState.IDLE]
      );
      
      // Verify agent is ready for new messages
      const validMessage = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "const x = 1;",
        filePath: "test.ts",
      });
      await expect(agent.processMessage(validMessage)).resolves.not.toThrow();
    });
  });

  describe("auto-fix handling", () => {
    it("should apply fixes when enabled", async () => {
      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1;",
        filePath: "test.ts",
        autoFix: true,
      });

      await verifyStateTransition(
        agent,
        async () => {
          await agent.processMessage(message);
        },
        [AgentState.IDLE, AgentState.WORKING, AgentState.IDLE]
      );

      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: true,
          output: expect.stringContaining("const x = 1;"),
        })
      );
    });
  });

  describe("configuration", () => {
    it("should respect custom ESLint config", async () => {
      const customAgent = new ESLintAgent({
        name: "custom-eslint",
        eslintConfig: {
          rules: {
            "no-var": "off",
            "prefer-const": "error",
          },
        },
      });

      const message = createTestMessage<LintPayload>(MESSAGE_TYPES.LINT_REQUEST, {
        code: "var x = 1;",
        filePath: "test.ts",
      });

      await customAgent.processMessage(message);
      expect(console.log).toHaveBeenCalledWith(
        "Lint result:",
        expect.objectContaining({
          fixed: false,
          errors: [],
          warnings: [],
        })
      );
    });
  });
}); 