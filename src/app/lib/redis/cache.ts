/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import logger from "../../utils/serverTools/logger";
import redis from "./redis";

const DEFAULT_TTL = 60; // 1 min

export const set_cache = async (
  key: string,
  value: unknown,
  ttl: number = DEFAULT_TTL
) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    logger.error(`Failed to set cache for key: ${key}`, err);
  }
};

/**
 * Get value from Redis cache
 */
export const get_cache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    if (!data) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    logger.debug(`Cache hit: ${key}`);
    return JSON.parse(data) as T;
  } catch (err) {
    logger.error(`Failed to get cache for key: ${key}`, err);
    return null;
  }
};

/**
 * Get cached data if available, otherwise fetch fresh data and cache it
 */
export const revalidate_cache = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> => {
  const cached_data = await get_cache<T>(key);
  if (cached_data) return cached_data;

  try {
    const fresh_data = await fetcher();
    await set_cache(key, fresh_data, ttl);
    return fresh_data;
  } catch (err) {
    logger.error(`Failed to fetch fresh data for key: ${key}`, err);
    throw err; // Let your API handle the error
  }
};

export const delete_cache = async (key: string) => {
  try {
    await redis.del(key);
    logger.debug(`Cache deleted: ${key}`);
  } catch (err) {
    logger.error(`Failed to delete cache for key: ${key}`, err);
  }
};

/**
 * ❌ Delete multiple cache keys
 */
export const delete_caches = async (keys: string[]) => {
  try {
    if (keys.length === 0) return;
    await redis.del(keys);
    logger.debug(`Caches deleted: ${keys.join(", ")}`);
  } catch (err) {
    logger.error(`Failed to delete caches: ${keys.join(", ")}`, err);
  }
};
