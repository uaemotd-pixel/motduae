function withLocalePrefix(href: string, locale?: string) {
  if (!locale) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith(`/${locale}/`) || href === `/${locale}`) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `/${locale}${path}`;
}

function pathAndSearch(url: string) {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  return `${path}${parsed.search}`;
}

/**
 * Client navigation that does not use the App Router action queue.
 * Mount-time auth redirects can run before Next.js has initialized;
 * `router.push` then throws "Router action dispatched before initialization".
 */
export function safeClientNavigate(
  href: string,
  options?: {
    replace?: boolean;
    locale?: string;
  },
) {
  if (typeof window === "undefined") return;

  const url = withLocalePrefix(href, options?.locale);
  if (pathAndSearch(url) === pathAndSearch(window.location.href)) return;

  const go = () => {
    if (pathAndSearch(url) === pathAndSearch(window.location.href)) return;
    if (options?.replace) window.location.replace(url);
    else window.location.assign(url);
  };

  window.setTimeout(go, 0);
}
