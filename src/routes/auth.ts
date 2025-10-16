import {Router, Request, Response} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {randomUUID} from "crypto";
import Joi from "joi";
import logger from "@/utils/logger";
import config from "@/utils/config";
import database from "@/services/database";
import {authenticateToken, authenticateApiKey} from "@/middleware/auth";

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
});

// Register new user
router.post("/register", async (req: Request, res: Response) => {
  try {
    const {error, value} = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const {username, email, password} = value;

    // Check if user already exists
    const existingUser = await database.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email or username already exists",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate API key
    const apiKey = `mcp_${randomUUID().replace(/-/g, "")}`;

    // Create user
    const result = await database.query(
      "INSERT INTO users (username, email, password_hash, api_key, rate_limit_per_hour) VALUES (?, ?, ?, ?, ?)",
      [username, email, passwordHash, apiKey, 100] // Default rate limit: 100 requests per hour
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign({userId, email, username}, config.auth.jwtSecret, {
      expiresIn: "24h",
    });

    // Log user registration
    await database.query(
      "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        userId,
        "user_registered",
        JSON.stringify({username, email}),
        req.ip,
        req.get("User-Agent") || "",
      ]
    );

    logger.info(`New user registered: ${username} (${email})`);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: userId,
        username,
        email,
        apiKey,
        rateLimitPerHour: 100,
      },
      token,
    });
  } catch (error) {
    logger.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to register user",
    });
  }
});

// Login user
router.post("/login", async (req: Request, res: Response) => {
  try {
    const {error, value} = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const {email, password} = value;

    // Find user
    const users = await database.query(
      "SELECT id, username, email, password_hash, api_key, rate_limit_per_hour FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {userId: user.id, email: user.email, username: user.username},
      config.auth.jwtSecret,
      {expiresIn: "24h"}
    );

    // Log user login
    await database.query(
      "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        user.id,
        "user_login",
        JSON.stringify({email}),
        req.ip,
        req.get("User-Agent") || "",
      ]
    );

    logger.info(`User logged in: ${user.username} (${email})`);

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        apiKey: user.api_key,
        rateLimitPerHour: user.rate_limit_per_hour,
      },
      token,
    });
  } catch (error) {
    logger.error("Login error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to login",
    });
  }
});

// Get user profile
router.get(
  "/profile",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      const users = await database.query(
        "SELECT id, username, email, api_key, rate_limit_per_hour, created_at FROM users WHERE id = ?",
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "User not found",
        });
      }

      const user = users[0];

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          apiKey: user.api_key,
          rateLimitPerHour: user.rate_limit_per_hour,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      logger.error("Profile fetch error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to fetch profile",
      });
    }
  }
);

// Update user profile
router.put(
  "/profile",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const {error, value} = updateProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation Error",
          message: error.details[0].message,
        });
      }

      const userId = (req as any).user.userId;
      const {username, email} = value;

      // Check if username or email already exists (excluding current user)
      if (username || email) {
        const existingUser = await database.query(
          "SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?",
          [username || "", email || "", userId]
        );

        if (existingUser.length > 0) {
          return res.status(409).json({
            error: "Conflict",
            message: "Username or email already exists",
          });
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (username) {
        updates.push("username = ?");
        values.push(username);
      }
      if (email) {
        updates.push("email = ?");
        values.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "No fields to update",
        });
      }

      values.push(userId);

      await database.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      // Log profile update
      await database.query(
        "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          "profile_updated",
          JSON.stringify({username, email}),
          req.ip,
          req.get("User-Agent") || "",
        ]
      );

      logger.info(`User profile updated: ${userId}`);

      return res.json({
        message: "Profile updated successfully",
      });
    } catch (error) {
      logger.error("Profile update error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update profile",
      });
    }
  }
);

// Generate new API key
router.post(
  "/api-key/regenerate",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const newApiKey = `mcp_${randomUUID().replace(/-/g, "")}`;

      await database.query("UPDATE users SET api_key = ? WHERE id = ?", [
        newApiKey,
        userId,
      ]);

      // Log API key regeneration
      await database.query(
        "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          "api_key_regenerated",
          JSON.stringify({newApiKey}),
          req.ip,
          req.get("User-Agent") || "",
        ]
      );

      logger.info(`API key regenerated for user: ${userId}`);

      return res.json({
        message: "API key regenerated successfully",
        apiKey: newApiKey,
      });
    } catch (error) {
      logger.error("API key regeneration error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to regenerate API key",
      });
    }
  }
);

// Update rate limit
router.put(
  "/rate-limit",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const {rateLimitPerHour} = req.body;

      if (
        !rateLimitPerHour ||
        typeof rateLimitPerHour !== "number" ||
        rateLimitPerHour < 1
      ) {
        return res.status(400).json({
          error: "Bad Request",
          message: "rateLimitPerHour must be a positive number",
        });
      }

      const userId = (req as any).user.userId;

      await database.query(
        "UPDATE users SET rate_limit_per_hour = ? WHERE id = ?",
        [rateLimitPerHour, userId]
      );

      // Log rate limit update
      await database.query(
        "INSERT INTO audit_log (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          "rate_limit_updated",
          JSON.stringify({rateLimitPerHour}),
          req.ip,
          req.get("User-Agent") || "",
        ]
      );

      logger.info(
        `Rate limit updated for user ${userId}: ${rateLimitPerHour}/hour`
      );

      return res.json({
        message: "Rate limit updated successfully",
        rateLimitPerHour,
      });
    } catch (error) {
      logger.error("Rate limit update error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update rate limit",
      });
    }
  }
);

// Get user's API usage stats
router.get("/usage", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get usage stats for the last 24 hours
    const usage = await database.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM audit_log 
      WHERE user_id = ? AND action = 'api_request' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [userId]
    );

    // Get current rate limit
    const user = await database.query(
      "SELECT rate_limit_per_hour FROM users WHERE id = ?",
      [userId]
    );

    return res.json({
      usage: {
        totalRequests24h: usage[0].total_requests,
        activeDays24h: usage[0].active_days,
        rateLimitPerHour: user[0].rate_limit_per_hour,
      },
    });
  } catch (error) {
    logger.error("Usage stats error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch usage stats",
    });
  }
});

export default router;
