import mysql from "mysql2/promise";
import logger from "@/utils/logger";
import config from "@/utils/config";

class DatabaseService {
  private connection: mysql.Connection | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      if (this.connection && this.isConnected) {
        logger.info("Reusing existing database connection");
        return;
      }

      this.connection = await mysql.createConnection({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        charset: "utf8mb4_unicode_ci",
        connectTimeout: 10000,
      });

      this.isConnected = true;
      logger.info("✅ 💃 Connected to MySQL database successfully");
    } catch (error) {
      logger.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.isConnected = false;
      logger.info("Database connection closed!");
    }
  }

  async closeConnection(): Promise<void> {
    await this.disconnect();
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.connection || !this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error("Database query error:", error);
      throw error;
    }
  }

  async getConnection(): Promise<mysql.Connection> {
    if (!this.connection || !this.isConnected) {
      await this.connect();
    }
    return this.connection!;
  }
}

export default new DatabaseService();
