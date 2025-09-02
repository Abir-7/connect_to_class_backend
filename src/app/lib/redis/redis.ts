import Redis from "ioredis";
import logger from "../../utils/serverTools/logger";
import { app_config } from "../../config";

const redis = new Redis({
  host: app_config.redis.host || "127.0.0.1",
  port: Number(app_config.redis.port) || 6379,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay; // reconnect delay in ms
  },
});

redis.on("connect", () => logger.info("✅ Redis connected"));
redis.on("ready", () => logger.info("✅ Redis ready"));
redis.on("error", (err) => logger.error("❌ Redis error:", err));
redis.on("close", () => logger.warn("Redis connection closed"));
redis.on("reconnecting", () => logger.warn("Redis reconnecting..."));

export default redis;
