import assert from "node:assert/strict";
import crypto from "crypto";
import test from "node:test";
import Redis from "ioredis";
import mongoose from "mongoose";
import AuthSession from "../models/AuthSession.js";
import { env } from "../config/env.js";
import {
  authSessionIsActive,
  deleteAuthSession,
  deleteAuthSessionsForUser,
  forgetSession,
  forgetUserSessions,
  readSessionCache,
  rememberSession,
} from "./authSession.js";

function openRedis() {
  const redis = new Redis("redis://127.0.0.1:6379", {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    retryStrategy: () => null,
  });
  redis.on("error", () => {});
  return redis;
}

async function connectPair() {
  const first = openRedis();
  const second = openRedis();
  await first.connect();
  await second.connect();
  await first.ping();
  return { first, second };
}

function sid() {
  return crypto.randomBytes(16).toString("hex");
}

async function wipe(redis, rows) {
  const keys = [];
  for (const row of rows) {
    keys.push(
      `motd:auth:sid:${row.sid}`,
      `motd:auth:dead:${row.sid}`,
      `motd:auth:user:${row.userId}`,
    );
  }
  if (keys.length) await redis.del(...keys);
}

test("two Redis clients share one session copy", async (t) => {
  let clients;
  try {
    clients = await connectPair();
  } catch {
    t.skip("Redis is not running on 127.0.0.1:6379");
    return;
  }

  const { first, second } = clients;
  const row = { sid: sid(), userId: "user-a" };
  try {
    assert.equal(await rememberSession(first, row.sid, row.userId), true);
    assert.equal(await readSessionCache(second, row.sid, row.userId), "hit");
    assert.equal(await authSessionIsActive(row.sid, row.userId, second), true);
    const ttl = await second.pttl(`motd:auth:sid:${row.sid}`);
    assert.ok(ttl > 0 && ttl <= 60_000);
  } finally {
    await wipe(first, [row]);
    first.disconnect();
    second.disconnect();
  }
});

test("a late write does not revive a logged-out session", async (t) => {
  let clients;
  try {
    clients = await connectPair();
  } catch {
    t.skip("Redis is not running on 127.0.0.1:6379");
    return;
  }

  const { first, second } = clients;
  const row = { sid: sid(), userId: "user-b" };
  try {
    await rememberSession(first, row.sid, row.userId);
    await forgetSession(first, row.sid, row.userId);
    assert.equal(await rememberSession(second, row.sid, row.userId), false);
    assert.equal(await readSessionCache(second, row.sid, row.userId), "dead");
    assert.equal(await authSessionIsActive(row.sid, row.userId, second), false);
  } finally {
    await wipe(first, [row]);
    first.disconnect();
    second.disconnect();
  }
});

test("deleting every session for a user leaves another user cached", async (t) => {
  let clients;
  try {
    clients = await connectPair();
  } catch {
    t.skip("Redis is not running on 127.0.0.1:6379");
    return;
  }

  const { first, second } = clients;
  const userA = "user-bulk-a";
  const userB = "user-bulk-b";
  const rows = [
    { sid: sid(), userId: userA },
    { sid: sid(), userId: userA },
    { sid: sid(), userId: userB },
  ];
  try {
    for (const row of rows) {
      await rememberSession(first, row.sid, row.userId);
    }
    await forgetUserSessions(first, userA);
    assert.equal(await readSessionCache(second, rows[0].sid, userA), "dead");
    assert.equal(await readSessionCache(second, rows[1].sid, userA), "dead");
    assert.equal(await readSessionCache(second, rows[2].sid, userB), "hit");
    assert.equal(await second.exists(`motd:auth:user:${userA}`), 0);
    assert.equal(await second.sismember(`motd:auth:user:${userB}`, rows[2].sid), 1);
  } finally {
    await wipe(first, rows);
    first.disconnect();
    second.disconnect();
  }
});

test("a Redis failure still uses the Mongo session row", async (t) => {
  let opened = false;
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.mongodbUri);
      opened = true;
    }
  } catch {
    t.skip("MongoDB is not available");
    return;
  }

  const userId = new mongoose.Types.ObjectId();
  const sessionId = sid();
  const down = {
    eval: async () => {
      throw new Error("Redis unavailable");
    },
    get: async () => {
      throw new Error("Redis unavailable");
    },
    smembers: async () => {
      throw new Error("Redis unavailable");
    },
  };

  try {
    await AuthSession.create({
      sid: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    });

    assert.equal(await authSessionIsActive(sessionId, userId, down), true);
    assert.equal(await authSessionIsActive(sessionId, userId, null), true);

    await deleteAuthSession(sessionId, down);
    const gone = await AuthSession.findOne({ sid: sessionId }).lean();
    assert.equal(gone, null);

    await AuthSession.create({
      sid: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await deleteAuthSessionsForUser(userId, down);
    const cleared = await AuthSession.findOne({ userId }).lean();
    assert.equal(cleared, null);
  } finally {
    await AuthSession.deleteMany({ sid: sessionId });
    if (opened) await mongoose.disconnect();
  }
});
