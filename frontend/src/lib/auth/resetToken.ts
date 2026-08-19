const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const TOKEN_IN_TEXT = /token(?:=|%3D)([a-f0-9]{64})/i;

function decodeRepeated(value: string, max = 3): string {
  let current = value;
  for (let i = 0; i < max; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function tokenFromText(value: string | null | undefined): string {
  if (!value) return "";
  const decoded = decodeRepeated(value).trim();
  if (RESET_TOKEN_PATTERN.test(decoded)) return decoded;
  const match = decoded.match(TOKEN_IN_TEXT);
  return match?.[1] || "";
}

/**
 * Gmail rewrites query-string reset links as `token%3D...&source=gmail`,
 * so `searchParams.get("token")` is empty. Recover the 64-char hex token
 * from the path, query, or an optional raw URL.
 */
export function extractResetToken(
  searchParams: URLSearchParams,
  pathToken?: string | string[] | null,
  rawUrl?: string | null,
): string {
  const fromPath = Array.isArray(pathToken) ? pathToken[0] : pathToken;
  const pathHit = tokenFromText(fromPath);
  if (pathHit) return pathHit;

  const direct = tokenFromText(searchParams.get("token"));
  if (direct) return direct;

  for (const [key, value] of searchParams.entries()) {
    const hit = tokenFromText(key) || tokenFromText(value);
    if (hit) return hit;
  }

  return tokenFromText(rawUrl);
}
