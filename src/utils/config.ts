import dotenv from "dotenv";

dotenv.config({path: ".env.local"});

export const config = {
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    env: process.env.NODE_ENV || "development",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    database: process.env.DB_NAME || "mcp_claude",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    apiUrl: process.env.CLAUDE_API_URL || "https://api.anthropic.com",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "default-secret-change-in-production",
    apiKey: process.env.API_KEY || "",
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "./logs/app.log",
  },
  workspace: {
    directory: process.env.WORKSPACE_DIR || "./workspace",
  },
  cors: {
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS || "http://localhost:3000"
    ).split(","),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
};

export default config;
