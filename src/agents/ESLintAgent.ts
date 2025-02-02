import { BaseAgent } from "./BaseAgent";
import { 
  BaseAgentMessage,
  ESLintMessage,
  ESLintConfig,
  LintResult
} from "./types";
import { MessageValidators, withTimeout, AgentError, AgentErrorType } from "./utils";
import { ESLint } from "eslint";
import path from "path";

/**
 * Agent responsible for running ESLint checks and fixes
 */
export class ESLintAgent extends BaseAgent<ESLintMessage, ESLintConfig> {
  private eslint: ESLint;

  constructor(config: ESLintConfig) {
    super(config);
    
    // Initialize ESLint with provided configuration
    this.eslint = new ESLint({
      fix: config.autoFix ?? false,
      overrideConfig: config.rules,
      overrideConfigFile: config.configPath,
    });
  }

  public async processMessage(message: ESLintMessage): Promise<void> {
    const validatedMessage = await MessageValidators.validateLintRequest(message);
    
    await withTimeout(
      this.runLintCheck(validatedMessage),
      this.config.timeoutMs,
      "ESLint check"
    );
  }

  protected async sendMessage(message: BaseAgentMessage): Promise<void> {
    // ESLint results are synchronous, no need to send messages
  }

  private async runLintCheck(message: ESLintMessage): Promise<void> {
    const { filePath, fileContent } = message.payload;
    
    try {
      // If file content is provided, lint it directly
      if (fileContent) {
        const results = await this.eslint.lintText(fileContent, {
          filePath: path.resolve(filePath),
        });
        await this.processLintResults(results);
        return;
      }

      // Otherwise, lint the file from disk
      const results = await this.eslint.lintFiles(filePath);
      await this.processLintResults(results);
      
      // Apply fixes if auto-fix is enabled
      if (this.config.autoFix) {
        await ESLint.outputFixes(results);
      }
    } catch (error) {
      throw new AgentError(
        AgentErrorType.OPERATION,
        "ESLint check failed",
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async processLintResults(results: ESLint.LintResult[]): Promise<void> {
    const lintResults: LintResult[] = results.map(result => ({
      filePath: result.filePath,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      messages: result.messages.map(msg => ({
        ruleId: msg.ruleId || "unknown",
        severity: msg.severity,
        message: msg.message,
        line: msg.line,
        column: msg.column,
        fix: msg.fix ? {
          range: msg.fix.range,
          text: msg.fix.text,
        } : undefined,
      })),
      source: result.source,
      output: result.output,
    }));

    if (lintResults.some(result => result.errorCount > 0)) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "ESLint errors detected",
        { results: lintResults }
      );
    }
  }

  /**
   * Update ESLint configuration
   */
  public updateConfig(config: Partial<ESLintConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    
    // Reinitialize ESLint with new configuration
    this.eslint = new ESLint({
      fix: this.config.autoFix ?? false,
      overrideConfig: this.config.rules,
      overrideConfigFile: this.config.configPath,
    });
  }
} 