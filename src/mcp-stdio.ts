import {spawn} from "child_process";
import logger from "@/utils/logger";
import config from "@/utils/config";

class MCPStdioHandler {
  private process: any = null;
  private isConnected = false;

  async start(): Promise<void> {
    try {
      logger.info("Starting MCP STDIO handler...");

      // Start the MCP server process
      this.process = spawn("node", ["dist/server.js"], {
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "production",
          MCP_MODE: "stdio",
        },
      });

      this.process.stdout.on("data", (data: any) => {
        this.handleOutput(data);
      });

      this.process.stderr.on("data", (data: any) => {
        logger.error("MCP Process stderr:", data.toString());
      });

      this.process.on("close", (code: number) => {
        logger.info(`MCP Process exited with code ${code}`);
        this.isConnected = false;
      });

      this.process.on("error", (error: Error) => {
        logger.error("MCP Process error:", error);
        this.isConnected = false;
      });

      this.isConnected = true;
      logger.info("MCP STDIO handler started successfully");
    } catch (error) {
      logger.error("Failed to start MCP STDIO handler:", error);
      throw error;
    }
  }

  private handleOutput(data: any): void {
    const lines = data
      .toString()
      .split("\n")
      .filter((line: string) => line.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        logger.error("Failed to parse MCP message:", error, "Line:", line);
      }
    }
  }

  private handleMessage(message: any): void {
    logger.debug("Received MCP message:", message);
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.isConnected = false;
      logger.info("MCP STDIO handler stopped");
    }
  }

  isReady(): boolean {
    return this.isConnected && this.process && !this.process.killed;
  }
}

// Create singleton instance
const mcpStdioHandler = new MCPStdioHandler();

// Handle process termination
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down MCP STDIO handler...");
  await mcpStdioHandler.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down MCP STDIO handler...");
  await mcpStdioHandler.stop();
  process.exit(0);
});

export default mcpStdioHandler;
