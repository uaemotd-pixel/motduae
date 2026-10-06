import crypto from "crypto";
import AuthSession from "../models/AuthSession.js";
import { env } from "../config/env.js";
import { jwtExpiresToMs } from "../utils/authCookie.js";
import { getRateLimitRedis } from "./rateLimitRedis.js";

const ALIVE_TTL_MS = 60 * 1000;

const READ_SESSION = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 0
end
local owner = redis.call('GET', KEYS[2])
if owner and owner == ARGV[1] then
  return 1
end
return -1
`;

const REMEMBER_SESSION = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 0
end
redis.call('SET', KEYS[2], ARGV[1], 'PX', ARGV[2])
redis.call('SADD', KEYS[3], ARGV[3])
redis.call('PEXPIRE', KEYS[3], ARGV[4])
return 1
`;

const FORGET_SESSION = `
redis.call('SET', KEYS[1], '1', 'PX', ARGV[1])
redis.call('DEL', KEYS[2])
if ARGV[2] ~= '' then
  redis.call('SREM', KEYS[3], ARGV[3])
end
return 1
`;

function aliveKey(sid) {
  return `motd:auth:sid:${sid}`;
}

function deadKey(sid) {
  return `motd:auth:dead:${sid}`;
}

function userKey(userId) {
  return `motd:auth:user:${userId}`;
}

function resolveRedis(redis) {
  if (redis === null) return null;
  return redis === undefined ? getRateLimitRedis() : redis;
}

function userSetTtlMs() {
  return jwtExpiresToMs(env.jwtExpiresIn);
}

/**
 * @returns {"hit" | "dead" | "miss"}
 */
export async function readSessionCache(redis, sid, userId) {
  const result = await redis.eval(
    READ_SESSION,
    2,
    deadKey(sid),
    aliveKey(sid),
    String(userId),
  );
  if (result == null) return "miss";
  if (Number(result) === 1) return "hit";
  if (Number(result) === 0) return "dead";
  return "miss";
}

export async function rememberSession(redis, sid, userId) {
  const sessionId = String(sid || "").trim();
  const ownerId = String(userId || "").trim();
  if (!sessionId || !ownerId) return false;
  const wrote = await redis.eval(
    REMEMBER_SESSION,
    3,
    deadKey(sessionId),
    aliveKey(sessionId),
    userKey(ownerId),
    ownerId,
    String(ALIVE_TTL_MS),
    sessionId,
    String(userSetTtlMs()),
  );
  return Number(wrote) === 1;
}

export async function forgetSession(redis, sid, userId) {
  const sessionId = String(sid || "").trim();
  if (!sessionId) return;
  const ownerId = String(userId || "").trim();
  await redis.eval(
    FORGET_SESSION,
    3,
    deadKey(sessionId),
    aliveKey(sessionId),
    ownerId ? userKey(ownerId) : deadKey(sessionId),
    String(ALIVE_TTL_MS),
    ownerId ? sessionId : "",
    sessionId,
  );
}

export async function forgetUserSessions(redis, userId) {
  const ownerId = String(userId || "").trim();
  if (!ownerId) return;
  const sids = await redis.smembers(userKey(ownerId));
  const pipeline = redis.pipeline();
  for (const sid of sids) {
    pipeline.eval(
      FORGET_SESSION,
      3,
      deadKey(sid),
      aliveKey(sid),
      userKey(ownerId),
      String(ALIVE_TTL_MS),
      sid,
      sid,
    );
  }
  pipeline.del(userKey(ownerId));
  const results = await pipeline.exec();
  const failed = results?.find(([err]) => err);
  if (failed) throw failed[0];
}

async function cacheSession(sid, userId) {
  const redis = getRateLimitRedis();
  if (!redis) return;
  try {
    await rememberSession(redis, sid, userId);
  } catch (err) {
    console.error("Session cache update failed:", err.message);
  }
}

async function uncacheSession(sid, userId, redis) {
  const client = resolveRedis(redis);
  if (!client) return;
  try {
    await forgetSession(client, sid, userId);
  } catch (err) {
    console.error("Session cache update failed:", err.message);
  }
}

async function uncacheUser(userId, redis) {
  const client = resolveRedis(redis);
  if (!client) return;
  try {
    await forgetUserSessions(client, userId);
  } catch (err) {
    console.error("Session cache update failed:", err.message);
  }
}

export async function createAuthSession(userId) {
  const sid = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + jwtExpiresToMs(env.jwtExpiresIn));
  await AuthSession.create({ sid, userId, expiresAt });
  await cacheSession(sid, userId);
  return sid;
}

export async function authSessionIsActive(sid, userId, redis) {
  const sessionId = String(sid || "").trim();
  if (!sessionId || !userId) return false;

  const client = resolveRedis(redis);
  if (client) {
    try {
      const cached = await readSessionCache(client, sessionId, userId);
      if (cached === "hit") return true;
      if (cached === "dead") return false;
    } catch {
      // The session row is still in Mongo when Redis cannot be reached.
    }
  }

  const row = await AuthSession.findOne({
    sid: sessionId,
    userId,
    expiresAt: { $gt: new Date() },
  })
    .select("_id")
    .lean();
  if (!row) return false;

  if (client) {
    try {
      await rememberSession(client, sessionId, userId);
    } catch {
      // The next request reads Mongo again.
    }
  }
  return true;
}

export async function deleteAuthSession(sid, redis) {
  const sessionId = String(sid || "").trim();
  if (!sessionId) return;

  const client = resolveRedis(redis);
  let cachedOwner = "";
  if (client) {
    try {
      cachedOwner = String((await client.get(aliveKey(sessionId))) || "");
    } catch {
      cachedOwner = "";
    }
  }

  const row = await AuthSession.findOneAndDelete({ sid: sessionId })
    .select("userId")
    .lean();
  await uncacheSession(sessionId, row?.userId || cachedOwner, client);
}

export async function deleteAuthSessionsForUser(userId, redis) {
  if (!userId) return;
  await AuthSession.deleteMany({ userId });
  await uncacheUser(userId, redis);
}
