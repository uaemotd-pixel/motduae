import crypto from "crypto";
import Redis from "ioredis";
import { env } from "../config/env.js";

const SLIDING_INCREMENT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
redis.call('PEXPIRE', key, window)
local resetAt = now + window
if oldest[2] then
  resetAt = tonumber(oldest[2]) + window
end
return {count, resetAt}
`;

const SLIDING_PEEK = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count == 0 then
  redis.call('DEL', key)
  return {0, 0}
end
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetAt = tonumber(oldest[2]) + window
return {count, resetAt}
`;

const SLIDING_DECREMENT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
redis.call('ZPOPMAX', key)
local count = redis.call('ZCARD', key)
if count == 0 then
  redis.call('DEL', key)
else
  redis.call('PEXPIRE', key, window)
end
return count
`;

let client;

export function attachRateLimitScripts(redis) {
  redis.defineCommand("slidingIncrement", {
    numberOfKeys: 1,
    lua: SLIDING_INCREMENT,
  });
  redis.defineCommand("slidingPeek", {
    numberOfKeys: 1,
    lua: SLIDING_PEEK,
  });
  redis.defineCommand("slidingDecrement", {
    numberOfKeys: 1,
    lua: SLIDING_DECREMENT,
  });
}

export function rateLimitStoreError(err) {
  const error = new Error("Please try again in a moment");
  error.name = "RateLimitStoreError";
  error.statusCode = 503;
  error.cause = err;
  return error;
}

export function getRateLimitRedis() {
  if (!env.redisUrl) return null;
  if (client) return client;

  client = new Redis(env.redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  });
  client.on("error", (err) => {
    console.error("Rate limit Redis error:", err.message);
  });
  attachRateLimitScripts(client);
  return client;
}

export async function connectRateLimitRedis() {
  const redis = getRateLimitRedis();
  if (!redis) return null;
  if (redis.status === "ready" || redis.status === "connecting") return redis;
  try {
    await redis.connect();
  } catch (err) {
    console.error(
      "Rate limit Redis unavailable. Limited routes will refuse until it connects.",
      err.message,
    );
  }
  return redis;
}

/**
 * One sliding window shared by every Node process.
 * localKeys is false because a hit in this process counts on the others.
 */
export class RedisSlidingWindowStore {
  constructor(redis, namespace) {
    this.client = redis;
    this.windowMs = 60 * 1000;
    this.localKeys = false;
    this.prefix = `motd:rl:${namespace}:`;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  redisKey(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const now = Date.now();
    const member = `${now}-${crypto.randomBytes(6).toString("hex")}`;
    try {
      const result = await this.client.slidingIncrement(
        this.redisKey(key),
        String(now),
        String(this.windowMs),
        member,
      );
      return {
        totalHits: Number(result[0]),
        resetTime: new Date(Number(result[1])),
      };
    } catch (err) {
      throw rateLimitStoreError(err);
    }
  }

  async get(key) {
    try {
      const result = await this.client.slidingPeek(
        this.redisKey(key),
        String(Date.now()),
        String(this.windowMs),
      );
      const totalHits = Number(result[0]);
      if (!totalHits) return undefined;
      return {
        totalHits,
        resetTime: new Date(Number(result[1])),
      };
    } catch (err) {
      throw rateLimitStoreError(err);
    }
  }

  async decrement(key) {
    try {
      await this.client.slidingDecrement(
        this.redisKey(key),
        String(Date.now()),
        String(this.windowMs),
      );
    } catch (err) {
      throw rateLimitStoreError(err);
    }
  }

  async resetKey(key) {
    try {
      await this.client.del(this.redisKey(key));
    } catch (err) {
      throw rateLimitStoreError(err);
    }
  }

  async resetAll() {
    try {
      const pattern = `${this.prefix}*`;
      let cursor = "0";
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = next;
        if (keys.length) await this.client.del(...keys);
      } while (cursor !== "0");
    } catch (err) {
      throw rateLimitStoreError(err);
    }
  }
}
