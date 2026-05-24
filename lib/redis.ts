import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client.
// Redis.fromEnv() automatically reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export const CACHE_KEYS = {
  ALL_PRODUCTS: "allo:products:all",
  PRODUCT_ITEM: (id: string) => `allo:products:item:${id}`,
};

/**
 * Fetch a cached item from Redis, with automatic JSON parsing.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    
    // Upstash Redis JS SDK automatically parses JSON for get<T> or returns object if it was serialized.
    // To be perfectly safe, check type and parse if it's a string representing JSON.
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    }
    return data as T;
  } catch (error) {
    console.error(`[Redis Cache] GET error for key "${key}":`, error);
    return null;
  }
}

/**
 * Cache an item in Redis with a specified TTL (in seconds).
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
  if (!redis) return;
  try {
    // Convert to string if it's an object/array, otherwise store as is.
    const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
    await redis.set(key, serialized, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[Redis Cache] SET error for key "${key}":`, error);
  }
}

/**
 * Delete a single cached item.
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Redis Cache] DELETE error for key "${key}":`, error);
  }
}

/**
 * Helper to invalidate the products list cache and/or a specific product item cache.
 */
export async function invalidateProductCache(productId?: string): Promise<void> {
  if (!redis) return;
  try {
    const keysToDelete = [CACHE_KEYS.ALL_PRODUCTS];
    if (productId) {
      keysToDelete.push(CACHE_KEYS.PRODUCT_ITEM(productId));
    }
    await redis.del(...keysToDelete);
    console.log(`[Redis Cache] Invalidated product cache keys: ${keysToDelete.join(", ")}`);
  } catch (error) {
    console.error(`[Redis Cache] Invalidation error:`, error);
  }
}
