import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import logger from "@/utils/logger";
import config from "@/utils/config";
import database from "@/services/database";
import cache from "@/services/cache";
import mcpStdioHandler from "@/mcp-stdio";

// Import routes
import healthRoutes from "@/routes/health";
import toolsRoutes from "@/routes/tools";
import authRoutes from "@/routes/auth";

dotenv.config({path: ".env.development"});

class Server {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: config.cors.allowedOrigins,
        credentials: true,
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: "Too many requests from this IP, please try again later.",
    });
    this.app.use("/api/", limiter);

    // General middleware
    this.app.use(compression());
    this.app.use(
      morgan("combined", {
        stream: {write: (message) => logger.info(message.trim())},
      })
    );
    this.app.use(express.json({limit: "10mb"}));
    this.app.use(express.urlencoded({extended: true, limit: "10mb"}));
  }

  private initializeRoutes(): void {
    this.app.get("/", (req, res) => {
      res.json({
        message: "MCP Server for Claude",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use("/api/health", healthRoutes);
    this.app.use("/api/tools", toolsRoutes);
    this.app.use("/api/auth", authRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.originalUrl} not found`,
      });
    });

    // Global error handler
    this.app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        logger.error("Unhandled error:", error);

        const statusCode = error.statusCode || 500;
        const message =
          process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : error.message;

        res.status(statusCode).json({
          error: "Internal Server Error",
          message,
          ...(process.env.NODE_ENV !== "production" && {stack: error.stack}),
        });
      }
    );
  }

  async start(): Promise<void> {
    try {
      // Connect to services (optional in development)
      if (process.env.SKIP_DATABASE !== "true") {
        await database.connect();
      } else {
        logger.info("Skipping database connection (development mode)");
      }

      if (process.env.SKIP_REDIS !== "true") {
        await cache.connect();
      } else {
        logger.info("Skipping Redis connection (development mode)");
      }

      // Initialize MCP STDIO handler if in MCP mode
      if (process.env.MCP_MODE === "stdio") {
        await mcpStdioHandler.start();
      }

      // Start server
      this.server = this.app.listen(config.server.port, () => {
        logger.info(
          `Server running on port ${config.server.port} in ${config.server.env} mode`
        );
      });

      // Graceful shutdown
      process.on("SIGTERM", this.gracefulShutdown.bind(this));
      process.on("SIGINT", this.gracefulShutdown.bind(this));
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    this.server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await mcpStdioHandler.stop();
        await database.disconnect();
        await cache.disconnect();
        logger.info("All connections closed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 30000);
  }
}

const server = new Server();
server.start().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});

export default server;
