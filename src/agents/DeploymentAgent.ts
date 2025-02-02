import { BaseAgent } from "./BaseAgent";
import { 
  BaseAgentMessage,
  DeploymentMessage,
  DeploymentConfig,
  DeploymentStatus,
  AgentState
} from "./types";
import { MessageValidators, withTimeout, AgentError, AgentErrorType } from "./utils";
import path from "path";
import fs from "fs/promises";

interface BuildResult {
  status: "pending" | "building" | "success" | "failed";
  duration: number;
  errors?: string[];
  warnings?: string[];
  artifacts?: string[];
}

/**
 * Agent responsible for handling deployment operations
 */
export class DeploymentAgent extends BaseAgent<DeploymentMessage, DeploymentConfig> {
  private deployments: Map<string, DeploymentStatus>;
  private currentBuild: BuildResult | null = null;

  constructor(config: DeploymentConfig) {
    super(config);
    this.deployments = new Map();
  }

  public async processMessage(message: DeploymentMessage): Promise<void> {
    const validatedMessage = await MessageValidators.validateDeploymentRequest(message);
    
    await withTimeout(
      this.buildProject(validatedMessage),
      this.config.buildTimeout ?? this.config.timeoutMs,
      "build process"
    );
  }

  protected async sendMessage(message: BaseAgentMessage): Promise<void> {
    // In a real implementation, this would send the message through the orchestrator
    console.log("Build result:", message.payload);
  }

  private async buildProject(message: DeploymentMessage): Promise<void> {
    const { projectPath, buildConfig } = message.payload;

    if (!projectPath) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Project path is required"
      );
    }

    this.currentBuild = {
      status: "pending",
      duration: 0,
    };

    const startTime = Date.now();

    try {
      // Set build status to building
      this.currentBuild.status = "building";

      // Mock build process (replace with actual Vite build in production)
      await this.mockBuildProcess();

      const duration = Date.now() - startTime;
      const result: BuildResult = {
        status: "success",
        duration,
        artifacts: [
          "dist/index.html",
          "dist/assets/main.js",
          "dist/assets/style.css",
        ],
      };

      this.currentBuild = result;
      await this.sendMessage({
        type: "BUILD_RESULT",
        targetAgent: message.targetAgent,
        payload: result,
      });
    } catch (error) {
      const result: BuildResult = {
        status: "failed",
        duration: Date.now() - startTime,
        errors: [(error as Error).message],
      };

      this.currentBuild = result;
      await this.sendMessage({
        type: "BUILD_RESULT",
        targetAgent: message.targetAgent,
        payload: result,
      });
      throw error;
    }
  }

  private async mockBuildProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const buildTime = Math.random() * 2000 + 1000; // 1-3 seconds

      // Simulate random build failures
      if (Math.random() < 0.1) {
        reject(new Error("Random build failure"));
        return;
      }

      setTimeout(resolve, buildTime);
    });
  }

  /**
   * Get current build status
   */
  public getCurrentBuild(): BuildResult | null {
    return this.currentBuild;
  }

  private async handleDeployment(message: DeploymentMessage): Promise<void> {
    const { deploymentId, action, buildPath } = message.payload;
    
    try {
      switch (action) {
        case "START":
          await this.startDeployment(deploymentId, buildPath);
          break;
        case "CHECK":
          await this.checkDeployment(deploymentId);
          break;
        case "CANCEL":
          await this.cancelDeployment(deploymentId);
          break;
        default:
          throw new AgentError(
            AgentErrorType.VALIDATION,
            `Unsupported deployment action: ${action}`,
            { deploymentId }
          );
      }
    } catch (error) {
      this.updateDeploymentStatus(deploymentId, {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async startDeployment(deploymentId: string, buildPath: string): Promise<void> {
    // Validate build path exists
    try {
      await fs.access(path.resolve(buildPath));
    } catch {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Build path does not exist",
        { buildPath }
      );
    }

    // Initialize deployment status
    this.updateDeploymentStatus(deploymentId, {
      status: "IN_PROGRESS",
      startTime: Date.now(),
      buildPath,
      retryCount: 0,
    });

    try {
      // Validate build artifacts
      await this.validateBuildArtifacts(buildPath);
      
      // Start deployment process
      await this.deploy(deploymentId, buildPath);
      
      this.updateDeploymentStatus(deploymentId, {
        status: "COMPLETED",
        completionTime: Date.now(),
      });
    } catch (error) {
      const currentStatus = this.deployments.get(deploymentId);
      
      if (currentStatus && currentStatus.retryCount < (this.config.maxRetries ?? 3)) {
        // Retry deployment
        this.updateDeploymentStatus(deploymentId, {
          status: "RETRYING",
          retryCount: (currentStatus.retryCount ?? 0) + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Schedule retry
        setTimeout(() => {
          void this.startDeployment(deploymentId, buildPath);
        }, 5000); // 5 second delay between retries
      } else {
        throw new AgentError(
          AgentErrorType.OPERATION,
          "Deployment failed",
          {
            deploymentId,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }
  }

  private async checkDeployment(deploymentId: string): Promise<void> {
    const status = this.deployments.get(deploymentId);
    
    if (!status) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Deployment not found",
        { deploymentId }
      );
    }

    // Return current status
    return;
  }

  private async cancelDeployment(deploymentId: string): Promise<void> {
    const status = this.deployments.get(deploymentId);
    
    if (!status) {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Deployment not found",
        { deploymentId }
      );
    }

    if (status.status === "COMPLETED" || status.status === "FAILED") {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Cannot cancel completed or failed deployment",
        { deploymentId, currentStatus: status.status }
      );
    }

    this.updateDeploymentStatus(deploymentId, {
      status: "CANCELLED",
      completionTime: Date.now(),
    });
  }

  private async validateBuildArtifacts(buildPath: string): Promise<void> {
    const requiredFiles = ["index.html", "assets"];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(buildPath, file));
      } catch {
        throw new AgentError(
          AgentErrorType.VALIDATION,
          "Invalid build artifacts",
          { missingFile: file }
        );
      }
    }
  }

  private async deploy(deploymentId: string, buildPath: string): Promise<void> {
    const artifactsPath = this.config.artifactsPath ?? path.join(process.cwd(), "deployments");
    const deploymentPath = path.join(artifactsPath, deploymentId);

    try {
      // Create deployment directory
      await fs.mkdir(deploymentPath, { recursive: true });
      
      // Copy build artifacts
      await this.copyDirectory(buildPath, deploymentPath);
      
      // Validate deployment
      await this.validateDeployment(deploymentPath);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.OPERATION,
        "Deployment process failed",
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    await Promise.all(entries.map(async entry => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }));
  }

  private async validateDeployment(deploymentPath: string): Promise<void> {
    // Implement deployment validation logic here
    // For example, checking if all required files are present and accessible
    const indexPath = path.join(deploymentPath, "index.html");
    
    try {
      await fs.access(indexPath);
    } catch {
      throw new AgentError(
        AgentErrorType.VALIDATION,
        "Deployment validation failed",
        { reason: "Missing index.html" }
      );
    }
  }

  private updateDeploymentStatus(deploymentId: string, update: Partial<DeploymentStatus>): void {
    const currentStatus = this.deployments.get(deploymentId) ?? {
      status: "PENDING",
      startTime: Date.now(),
    };

    this.deployments.set(deploymentId, {
      ...currentStatus,
      ...update,
    });
  }

  /**
   * Get the current status of a deployment
   */
  public getDeploymentStatus(deploymentId: string): DeploymentStatus | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Clear deployment history
   */
  public clearDeployments(): void {
    this.deployments.clear();
  }
} 