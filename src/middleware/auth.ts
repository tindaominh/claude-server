import {Request, Response, NextFunction} from "express";
import jwt from "jsonwebtoken";
import logger from "@/utils/logger";
import config from "@/utils/config";
import database from "@/services/database";
import cache from "@/services/cache";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
    apiKey?: string;
    rateLimitPerHour?: number;
  };
}

// JWT Token Authentication
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Access token required",
      });
      return;
    }

    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

    // Verify user still exists and is active
    const users = await database.query(
      "SELECT id, username, email, api_key, rate_limit_per_hour FROM users WHERE id = ?",
      [decoded.userId]
    );

    if (users.length === 0) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User not found",
      });
      return;
    }

    const user = users[0];
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      apiKey: user.api_key,
      rateLimitPerHour: user.rate_limit_per_hour,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
      return;
    }

    logger.error("Token authentication error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

// API Key Authentication
export const authenticateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      res.status(401).json({
        error: "Unauthorized",
        message: "API key required",
      });
      return;
    }

    // Check cache first
    const cacheKey = `api_key:${apiKey}`;
    let userStr = await cache.get(cacheKey);
    let user: any = null;

    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        logger.error("Failed to parse cached user data:", error);
      }
    }

    if (!user) {
      // Query database
      const users = await database.query(
        "SELECT id, username, email, api_key, rate_limit_per_hour FROM users WHERE api_key = ?",
        [apiKey]
      );

      if (users.length === 0) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid API key",
        });
        return;
      }

      user = users[0];

      // Cache user data for 5 minutes
      await cache.set(cacheKey, JSON.stringify(user), 300);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      apiKey: user.api_key,
      rateLimitPerHour: user.rate_limit_per_hour,
    };

    next();
  } catch (error) {
    logger.error("API key authentication error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
};

// Rate limiting per user
export const userRateLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userId = req.user.userId;
    const rateLimitPerHour = req.user.rateLimitPerHour || 100;
    const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const cacheKey = `rate_limit:${userId}:${currentHour}`;

    // Get current request count for this hour
    const currentCountStr = (await cache.get(cacheKey)) || "0";
    const currentCount = parseInt(currentCountStr, 10);

    if (currentCount >= rateLimitPerHour) {
      res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Maximum ${rateLimitPerHour} requests per hour.`,
        retryAfter: 3600, // 1 hour in seconds
      });
      return;
    }

    // Increment counter
    await cache.set(cacheKey, (currentCount + 1).toString(), 3600); // Expire after 1 hour

    // Log API request
    await database.query(
      "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        userId,
        "api_request",
        JSON.stringify({
          endpoint: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
        }),
        req.ip,
        req.get("User-Agent") || "",
      ]
    );

    next();
  } catch (error) {
    logger.error("Rate limiting error:", error);
    // Don't block the request if rate limiting fails
    next();
  }
};

// Optional authentication (for public endpoints that can work with or without auth)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"] as string;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Try JWT authentication
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
        const users = await database.query(
          "SELECT id, username, email, api_key, rate_limit_per_hour FROM users WHERE id = ?",
          [decoded.userId]
        );

        if (users.length > 0) {
          const user = users[0];
          req.user = {
            userId: user.id,
            email: user.email,
            username: user.username,
            apiKey: user.api_key,
            rateLimitPerHour: user.rate_limit_per_hour,
          };
        }
      } catch (jwtError) {
        // JWT invalid, continue without authentication
      }
    } else if (apiKey) {
      // Try API key authentication
      try {
        const users = await database.query(
          "SELECT id, username, email, api_key, rate_limit_per_hour FROM users WHERE api_key = ?",
          [apiKey]
        );

        if (users.length > 0) {
          const user = users[0];
          req.user = {
            userId: user.id,
            email: user.email,
            username: user.username,
            apiKey: user.api_key,
            rateLimitPerHour: user.rate_limit_per_hour,
          };
        }
      } catch (dbError) {
        // Database error, continue without authentication
      }
    }

    next();
  } catch (error) {
    logger.error("Optional authentication error:", error);
    // Continue without authentication
    next();
  }
};

export {AuthenticatedRequest};
