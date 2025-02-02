import { BaseAgent } from "./BaseAgent";
import { 
  BaseAgentMessage, 
  VersionCheckMessage, 
  CompatibilityConfig,
} from "./types";
import { MessageValidators, withTimeout, AgentError, AgentErrorType } from "./utils";
import semver from "semver";

interface VersionMatrix {
  vite: string[];
  react: string[];
  next: string[];
}

const DEFAULT_VERSION_MATRIX: VersionMatrix = {
  vite: ["5.x"],
  react: ["18.x"],
  next: ["14.x"],
};

/**
 * Agent responsible for checking version compatibility
 */
export class CompatibilityAgent extends BaseAgent<VersionCheckMessage, CompatibilityConfig> {
  private versionMatrix: VersionMatrix;

  constructor(config: CompatibilityConfig) {
    super(config);
    this.versionMatrix = {
      vite: config.supportedVersions?.vite ?? DEFAULT_VERSION_MATRIX.vite,
      react: config.supportedVersions?.react ?? DEFAULT_VERSION_MATRIX.react,
      next: config.supportedVersions?.next ?? DEFAULT_VERSION_MATRIX.next,
    };
  }

  public async processMessage(message: VersionCheckMessage): Promise<void> {
    const validatedMessage = await MessageValidators.validateVersionCheck(message);
    
    await withTimeout(
      this.checkVersions(validatedMessage),
      this.config.timeoutMs,
      "version compatibility check"
    );
  }

  protected async sendMessage(message: BaseAgentMessage): Promise<void> {
    // Version check results are synchronous, no need to send messages
  }

  private async checkVersions(message: VersionCheckMessage): Promise<void> {
    const incompatibleVersions: string[] = [];
    const { viteVersion, reactVersion, nextVersion } = message.payload;

    // Check Vite version
    if (!this.isVersionCompatible(viteVersion, this.versionMatrix.vite)) {
      incompatibleVersions.push(
        `Vite version ${viteVersion} is not supported. Please use one of: ${this.versionMatrix.vite.join(", ")}`
      );
    }

    // Check React version if provided
    if (reactVersion && !this.isVersionCompatible(reactVersion, this.versionMatrix.react)) {
      incompatibleVersions.push(
        `React version ${reactVersion} is not supported. Please use one of: ${this.versionMatrix.react.join(", ")}`
      );
    }

    // Check Next.js version if provided
    if (nextVersion && !this.isVersionCompatible(nextVersion, this.versionMatrix.next)) {
      incompatibleVersions.push(
        `Next.js version ${nextVersion} is not supported. Please use one of: ${this.versionMatrix.next.join(", ")}`
      );
    }

    if (incompatibleVersions.length > 0) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Incompatible versions detected",
        { incompatibleVersions }
      );
    }
  }

  private isVersionCompatible(version: string, supportedVersions: string[]): boolean {
    return supportedVersions.some(supported => {
      try {
        return semver.satisfies(
          // Clean the version string to handle formats like "v1.2.3"
          semver.clean(version) || version,
          supported
        );
      } catch {
        return false;
      }
    });
  }

  /**
   * Update the supported version matrix
   */
  public updateVersionMatrix(matrix: Partial<VersionMatrix>): void {
    this.versionMatrix = {
      ...this.versionMatrix,
      ...matrix,
    };
  }
} 