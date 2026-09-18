/**
 * Update a query param without an App Router navigation.
 * `router.replace(?stock=low)` remounts the page and looks like a full refresh.
 */
export function replaceClientSearchParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (value === null || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}
