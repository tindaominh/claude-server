import {Router, Request, Response} from "express";
import logger from "@/utils/logger";

const router = Router();

// Basic health check
router.get("/", async (req: Request, res: Response) => {
  try {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(500).json({
      status: "unhealthy",
      error: "Health check failed",
    });
  }
});

// Detailed health check with dependencies
router.get("/detailed", async (req: Request, res: Response) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: "unknown",
      cache: "unknown",
    },
  };

  try {
    // Check database connection
    const database = require("@/services/database").default;
    await database.query("SELECT 1");
    health.services.database = "connected";
  } catch (error) {
    logger.error("Database health check failed:", error);
    health.services.database = "disconnected";
    health.status = "degraded";
  }

  try {
    // Check cache connection
    const cache = require("@/services/cache").default;
    await cache.set("health-check", "ok", 10);
    const result = await cache.get("health-check");
    health.services.cache = result === "ok" ? "connected" : "disconnected";
  } catch (error) {
    logger.error("Cache health check failed:", error);
    health.services.cache = "disconnected";
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
