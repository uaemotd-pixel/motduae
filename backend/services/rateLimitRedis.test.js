import assert from "node:assert/strict";
import test from "node:test";
import Redis from "ioredis";
import {
  attachRateLimitScripts,
  RedisSlidingWindowStore,
} from "./rateLimitRedis.js";

async function openRedis() {
  const redis = new Redis("redis://127.0.0.1:6379", {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    retryStrategy: () => null,
  });
  redis.on("error", () => {});
  await redis.connect();
  await redis.ping();
  attachRateLimitScripts(redis);
  return redis;
}

test("two Redis stores share one sliding window", async (t) => {
  let redis;
  try {
    redis = await openRedis();
  } catch {
    t.skip("Redis is not running on 127.0.0.1:6379");
    return;
  }

  const namespace = `test-${Date.now()}`;
  const first = new RedisSlidingWindowStore(redis, namespace);
  const second = new RedisSlidingWindowStore(redis, namespace);
  first.init({ windowMs: 15 * 60 * 1000 });
  second.init({ windowMs: 15 * 60 * 1000 });
  const key = "login_127.0.0.1_a@shop.com";

  try {
    await first.resetKey(key);
    const one = await first.increment(key);
    const two = await second.increment(key);
    assert.equal(one.totalHits, 1);
    assert.equal(two.totalHits, 2);
    assert.ok(two.resetTime instanceof Date);

    await second.decrement(key);
    const after = await first.get(key);
    assert.equal(after.totalHits, 1);

    await first.resetKey(key);
    assert.equal(await first.get(key), undefined);
  } finally {
    await first.resetAll();
    redis.disconnect();
  }
});

test("a Redis hit expires on its own", async (t) => {
  let redis;
  try {
    redis = await openRedis();
  } catch {
    t.skip("Redis is not running on 127.0.0.1:6379");
    return;
  }

  const namespace = `test-expire-${Date.now()}`;
  const store = new RedisSlidingWindowStore(redis, namespace);
  store.init({ windowMs: 500 });
  const key = "otp_send_127.0.0.1";

  try {
    await store.resetKey(key);
    await store.increment(key);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await store.increment(key);
    assert.equal((await store.get(key)).totalHits, 2);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const remaining = await store.get(key);
    assert.equal(remaining.totalHits, 1);
  } finally {
    await store.resetAll();
    redis.disconnect();
  }
});
