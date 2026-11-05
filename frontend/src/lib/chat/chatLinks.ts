/** Detect & classify URLs pasted in live chat (product / order / generic). */

const URL_RE =
  /(?:https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|(?:\/(?:en|ar))?(?:\/ready-made\/[^\s<>"')\]]+|\/fabrics\/[^\s<>"')\]]+|\/brands\/[^\s<>"')\]]+|\/designs\/[^\s<>"')\]]+|\/addons\/[^\s<>"')\]]+|\/orders\/track\/[^\s<>"')\]]+)|(?:\/(?:en|ar))?\/account\?[^\s<>"')\]]*tab=orders[^\s<>"')\]]*)/gi;

export type ChatLinkKind =
  | "ready-made"
  | "fabric"
  | "brand"
  | "design"
  | "addon"
  | "order"
  | "generic";

export type ChatLinkMatch = {
  raw: string;
  href: string;
  kind: ChatLinkKind;
  title: string;
  subtitle: string;
};

function stripTrailingPunct(raw: string) {
  return raw.replace(/[.,;:!?)]+$/g, "");
}

function ensureHref(raw: string) {
  const cleaned = stripTrailingPunct(raw.trim());
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^www\./i.test(cleaned)) return `https://${cleaned}`;
  if (cleaned.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${cleaned}`;
    }
    return cleaned;
  }
  return cleaned;
}

function pathOf(href: string) {
  try {
    const u = new URL(href, "https://motd.local");
    return `${u.pathname}${u.search}`;
  } catch {
    return href;
  }
}

function classify(href: string): Omit<ChatLinkMatch, "raw" | "href"> {
  const path = pathOf(href);
  const bare = path.replace(/^\/(en|ar)(?=\/)/i, "");

  if (/\/ready-made\//i.test(bare)) {
    const slug = decodeURIComponent(
      bare.split(/\/ready-made\//i)[1]?.split(/[/?#]/)[0] || "",
    ).replace(/-/g, " ");
    return {
      kind: "ready-made",
      title: slug ? titleCase(slug) : "Ready-made piece",
      subtitle: "Ready-made product",
    };
  }
  if (/\/fabrics\//i.test(bare)) {
    const slug = decodeURIComponent(
      bare.split(/\/fabrics\//i)[1]?.split(/[/?#]/)[0] || "",
    ).replace(/-/g, " ");
    return {
      kind: "fabric",
      title: slug ? titleCase(slug) : "Fabric",
      subtitle: "Fabric product",
    };
  }
  if (/\/brands\//i.test(bare)) {
    const slug = decodeURIComponent(
      bare.split(/\/brands\//i)[1]?.split(/[/?#]/)[0] || "",
    ).replace(/-/g, " ");
    return {
      kind: "brand",
      title: slug ? titleCase(slug) : "Brand",
      subtitle: "Brand page",
    };
  }
  if (/\/designs\//i.test(bare)) {
    const slug = decodeURIComponent(
      bare.split(/\/designs\//i)[1]?.split(/[/?#]/)[0] || "",
    ).replace(/-/g, " ");
    return {
      kind: "design",
      title: slug ? titleCase(slug) : "Design",
      subtitle: "Design page",
    };
  }
  if (/\/addons\//i.test(bare)) {
    const slug = decodeURIComponent(
      bare.split(/\/addons\//i)[1]?.split(/[/?#]/)[0] || "",
    ).replace(/-/g, " ");
    return {
      kind: "addon",
      title: slug ? titleCase(slug) : "Add-on",
      subtitle: "Add-on product",
    };
  }
  if (/\/orders\/track\//i.test(bare) || /[?&]tab=orders\b/i.test(bare)) {
    const track = bare.match(/\/orders\/track\/([^/?#]+)/i)?.[1];
    const orderId = new URL(href, "https://motd.local").searchParams.get(
      "orderId",
    );
    const id = decodeURIComponent(track || orderId || "");
    return {
      kind: "order",
      title: id ? `Order ${id}` : "Order",
      subtitle: "Order tracking",
    };
  }
  try {
    const host = new URL(href).hostname.replace(/^www\./i, "");
    return { kind: "generic", title: host || "Link", subtitle: "Open link" };
  } catch {
    return { kind: "generic", title: "Link", subtitle: "Open link" };
  }
}

function titleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function extractChatLinks(text: string): ChatLinkMatch[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: ChatLinkMatch[] = [];
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = stripTrailingPunct(m[0]);
    const href = ensureHref(raw);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push({ raw, href, ...classify(href) });
  }
  return out;
}

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

/** Split message text into plain + link segments for inline rendering. */
export function splitTextWithLinks(text: string): TextSegment[] {
  if (!text) return [];
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  const parts: TextSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index;
    if (start > last) {
      parts.push({ type: "text", value: text.slice(last, start) });
    }
    const raw = stripTrailingPunct(m[0]);
    const href = ensureHref(raw);
    parts.push({ type: "link", value: raw, href });
    last = start + m[0].length;
    // If we stripped punctuation, keep it as text.
    if (raw.length < m[0].length) {
      parts.push({
        type: "text",
        value: m[0].slice(raw.length),
      });
    }
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: text }];
}

/** Product / order style previews only (skip generic http links). */
export function extractPreviewLinks(text: string): ChatLinkMatch[] {
  return extractChatLinks(text).filter((l) => l.kind !== "generic");
}
