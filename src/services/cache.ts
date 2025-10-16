import {createClient, RedisClientType} from "@redis/client";
import logger from "@/utils/logger";
import config from "@/utils/config";

type TypeRedisClient = RedisClientType | null;

const createRedisOptions = () => {
  const CONNECT_TIMEOUT = 5000;
  const IDLE_TIMEOUT = 30000; // Idle timeout in milliseconds

  const redisClientOptions = {
    url: `redis://${config.redis.host}:${config.redis.port}`,
    socket: {
      connectTimeout: CONNECT_TIMEOUT,
      keepAlive: IDLE_TIMEOUT,
    },
  };

  if (config.redis.password) {
    Object.assign(redisClientOptions, {password: config.redis.password});
  }

  return redisClientOptions;
};

class CacheService {
  private client: TypeRedisClient = null;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      if (this.client) {
        logger.info("Reusing existing Redis client");
        return;
      }

      const options = createRedisOptions();
      this.client = createClient(options);

      this.client.on("connect", () => {
        logger.info("✅ 💃 Connected Redis successfully");
      });

      this.client.on("error", (error) => {
        logger.error(`❗️ Redis server refused the connection - ${error}`);
      });

      await this.client.connect();

      // Test connection
      const pingCommandResult = await this.client.ping();
      logger.info(`✅ 💃 Ping redis command: ${pingCommandResult}`);

      this.isConnected = true;
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info("Disconnect Redis successfully");
    }
  }

  async closeClient(): Promise<void> {
    await this.disconnect();
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      return await this.client!.get(key);
    } catch (error) {
      logger.error("Redis get error:", error);
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    expireInSeconds?: number
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      if (expireInSeconds) {
        await this.client!.setEx(key, expireInSeconds, value);
      } else {
        await this.client!.set(key, value);
      }
    } catch (error) {
      logger.error("Redis set error:", error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.error("Redis delete error:", error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error("Redis exists error:", error);
      return false;
    }
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }
    return this.client!;
  }
}

export default new CacheService();
