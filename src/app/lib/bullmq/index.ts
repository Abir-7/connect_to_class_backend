import IORedis from "ioredis";

import { app_config } from "../../config";

export const connection = new IORedis({
  host: app_config.redis.host,
  port: Number(app_config.redis.port),
  maxRetriesPerRequest: null,
});
