"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Shield,
  Store,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  ACTIVITY_LOG_ACCESS_HEADER,
  ACTIVITY_LOG_URL_KEY,
} from "@/lib/activityLog/access";

type CategoryOption = { value: string; label: string };

type ActivityItem = {
  _id: string;
  actorId?: string | null;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: string;
  categoryLabel?: string;
  method: string;
  path: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  meta?: unknown;
  ip: string;
  userAgent: string;
  statusCode: number | null;
  success: boolean;
  createdAt: string;
};

type ListResponse = {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stats: {
    todayCount: number;
    matchedCount: number;
    topActors: Array<{
      email: string;
      name: string;
      role: string;
      count: number;
    }>;
  };
  items: ActivityItem[];
};

type ActionKind =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "register"
  | "login_failed"
  | "view"
  | "other";

type RoleFilter =
  | ""
  | "admin"
  | "sub-admin"
  | "customer"
  | "tailor"
  | "fabric_store";

const ROLE_NAV: Array<{
  id: RoleFilter;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "",
    label: "Everyone",
    hint: "Show all people",
    icon: LayoutDashboard,
  },
  {
    id: "admin",
    label: "Admins",
    hint: "Show admin only",
    icon: Shield,
  },
  {
    id: "sub-admin",
    label: "Sub-admins",
    hint: "Show staff only",
    icon: Users,
  },
  {
    id: "customer",
    label: "Customers",
    hint: "Show shoppers only",
    icon: UserRound,
  },
  {
    id: "tailor",
    label: "Tailors",
    hint: "Show tailor shops only",
    icon: Scissors,
  },
  {
    id: "fabric_store",
    label: "Fabric stores",
    hint: "Show fabric shops only",
    icon: Store,
  },
];

/** Areas each role actually uses — drives the dropdown under the selected group. */
const AREAS_BY_ROLE: Record<RoleFilter, CategoryOption[]> = {
  "": [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "orders", label: "Orders" },
    { value: "payments", label: "Payments" },
    { value: "customers", label: "Customers (admin)" },
    { value: "readyMade", label: "Ready-made products" },
    { value: "fabrics", label: "Fabrics" },
    { value: "designs", label: "Designs" },
    { value: "tailors", label: "Tailors (admin)" },
    { value: "partners", label: "Fabric stores (admin)" },
    { value: "addons", label: "Add-ons" },
    { value: "settings", label: "Settings" },
    { value: "reviews", label: "Reviews" },
    { value: "subAdmins", label: "Sub-admins" },
    { value: "profile", label: "Customer profile" },
    { value: "family", label: "Family members" },
    { value: "account", label: "Account" },
    { value: "shop", label: "Shop / store profile" },
    { value: "dashboard", label: "Dashboard" },
    { value: "other", label: "Other" },
  ],
  admin: [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "dashboard", label: "Dashboard" },
    { value: "customers", label: "Managing customers" },
    { value: "orders", label: "Managing orders" },
    { value: "payments", label: "Payments & payouts" },
    { value: "readyMade", label: "Ready-made products" },
    { value: "fabrics", label: "Fabrics" },
    { value: "designs", label: "Designs" },
    { value: "addons", label: "Add-ons" },
    { value: "tailors", label: "Approving / managing tailor shops" },
    { value: "partners", label: "Approving / managing fabric stores" },
    { value: "reviews", label: "Moderating reviews" },
    { value: "settings", label: "Platform settings" },
    { value: "subAdmins", label: "Managing sub-admins" },
    { value: "other", label: "Other admin work" },
  ],
  "sub-admin": [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "dashboard", label: "Dashboard" },
    { value: "customers", label: "Managing customers" },
    { value: "orders", label: "Managing orders" },
    { value: "payments", label: "Payments & payouts" },
    { value: "readyMade", label: "Ready-made products" },
    { value: "fabrics", label: "Fabrics" },
    { value: "designs", label: "Designs" },
    { value: "addons", label: "Add-ons" },
    { value: "tailors", label: "Tailor shops" },
    { value: "partners", label: "Fabric stores" },
    { value: "reviews", label: "Reviews" },
    { value: "settings", label: "Settings" },
    { value: "other", label: "Other staff work" },
  ],
  customer: [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "orders", label: "Placing / tracking orders" },
    { value: "payments", label: "Checkout & payments" },
    { value: "profile", label: "Updating profile" },
    { value: "family", label: "Family members" },
    { value: "reviews", label: "Writing reviews" },
    { value: "account", label: "Account settings" },
    { value: "other", label: "Other customer actions" },
  ],
  tailor: [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "shop", label: "Shop profile & setup" },
    { value: "designs", label: "Creating / editing designs" },
    { value: "orders", label: "Handling custom orders" },
    { value: "payments", label: "Payouts & earnings" },
    { value: "other", label: "Other tailor actions" },
  ],
  fabric_store: [
    { value: "auth", label: "Sign-in & accounts" },
    { value: "shop", label: "Store profile & setup" },
    { value: "fabrics", label: "Adding / editing fabrics" },
    { value: "addons", label: "Add-ons catalog" },
    { value: "orders", label: "Fabric / retail orders" },
    { value: "payments", label: "Payouts & earnings" },
    { value: "other", label: "Other store actions" },
  ],
};

function areasForRole(role: RoleFilter): CategoryOption[] {
  return AREAS_BY_ROLE[role] || AREAS_BY_ROLE[""];
}

function areaDropdownTitle(role: RoleFilter): string {
  if (role === "customer") return "What the customer was doing";
  if (role === "tailor") return "What the tailor was doing";
  if (role === "fabric_store") return "What the fabric store was doing";
  if (role === "admin") return "What the admin was doing";
  if (role === "sub-admin") return "What the sub-admin was doing";
  return "What they were doing";
}

function buildPageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current]);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

function apiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === "production") return "";
  return "http://localhost:5000";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { relative: "—", absolute: "—", day: "—", time: "—" };
  }
  const absolute = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const day = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  let relative = absolute;
  if (mins < 1) relative = "Just now";
  else if (mins < 60) relative = `${mins} min ago`;
  else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) relative = `${hours} hour${hours === 1 ? "" : "s"} ago`;
    else {
      const days = Math.floor(hours / 24);
      if (days < 7) relative = `${days} day${days === 1 ? "" : "s"} ago`;
    }
  }
  return { relative, absolute, day, time };
}

function roleLabel(role: string) {
  if (role === "sub-admin") return "Sub-admin";
  if (role === "admin") return "Admin";
  if (role === "customer") return "Customer";
  if (role === "tailor") return "Tailor";
  if (role === "fabric_store") return "Fabric store";
  if (role === "guest") return "Guest";
  return role || "User";
}

function resolveActionKind(item: ActivityItem): ActionKind {
  const action = String(item.action || "").toLowerCase();
  const method = String(item.method || "").toUpperCase();
  if (action.includes("login_failed") || action === "auth.login_failed") {
    return "login_failed";
  }
  if (action.includes("logout") || action === "auth.logout") return "logout";
  if (action.includes("register") || action === "auth.register") {
    return "register";
  }
  if (action.includes("login") || action === "auth.login") return "login";
  if (action.includes(".view") || method === "GET") return "view";
  if (action.includes("delete") || method === "DELETE") return "delete";
  if (action.includes("create") || method === "POST") return "create";
  if (
    action.includes("update") ||
    method === "PUT" ||
    method === "PATCH"
  ) {
    return "update";
  }
  return "other";
}

const ACTION_STYLES: Record<
  ActionKind,
  { label: string; meaning: string; badge: string; row: string; icon: typeof Plus }
> = {
  create: {
    label: "Added",
    meaning: "Something new was created",
    badge: "bg-[#1f7a4d] text-white",
    row: "border-l-[#1f7a4d] bg-[#f3faf6]",
    icon: Plus,
  },
  update: {
    label: "Changed",
    meaning: "Something existing was edited",
    badge: "bg-[#2f6fed] text-white",
    row: "border-l-[#2f6fed] bg-[#f3f7ff]",
    icon: Pencil,
  },
  delete: {
    label: "Removed",
    meaning: "Something was deleted",
    badge: "bg-[#c23b3b] text-white",
    row: "border-l-[#c23b3b] bg-[#fff5f5]",
    icon: Trash2,
  },
  login: {
    label: "Signed in",
    meaning: "Someone logged into their account",
    badge: "bg-[#1c2b24] text-[#d8efe4]",
    row: "border-l-[#1c2b24] bg-[#f4f7f5]",
    icon: LogIn,
  },
  logout: {
    label: "Signed out",
    meaning: "Someone logged out",
    badge: "bg-[#4a4a46] text-white",
    row: "border-l-[#4a4a46] bg-[#f7f6f3]",
    icon: LogOut,
  },
  register: {
    label: "Registered",
    meaning: "A new account was created",
    badge: "bg-[#0f766e] text-white",
    row: "border-l-[#0f766e] bg-[#f0fdfa]",
    icon: UserPlus,
  },
  login_failed: {
    label: "Sign-in failed",
    meaning: "A sign-in attempt did not work",
    badge: "bg-[#c23b3b] text-white",
    row: "border-l-[#c23b3b] bg-[#fff5f5]",
    icon: AlertCircle,
  },
  view: {
    label: "Viewed",
    meaning: "Someone opened a sensitive record",
    badge: "bg-[#6b5b3e] text-white",
    row: "border-l-[#6b5b3e] bg-[#faf8f3]",
    icon: Eye,
  },
  other: {
    label: "Other",
    meaning: "Another kind of action",
    badge: "bg-[#2a2a28] text-white",
    row: "border-l-[#8a8578] bg-[#faf9f6]",
    icon: Activity,
  },
};

function humanResource(resourceType: string) {
  const map: Record<string, string> = {
    customers: "customer",
    customer: "customer",
    fabrics: "fabric",
    fabric: "fabric",
    designs: "design",
    design: "design",
    orders: "order",
    custom: "custom order",
    retail: "retail order",
    addons: "add-on",
    addon: "add-on",
    reviews: "review",
    review: "review",
    favourites: "favourite",
    favorites: "favourite",
    "family-members": "family member",
    profile: "profile",
    shop: "shop",
    session: "account",
    notifications: "notification",
    "ready-made": "ready-made product",
    "sub-admins": "sub-admin",
  };
  return map[resourceType] || resourceType.replace(/-/g, " ") || "item";
}

/** One clear sentence — this is what the team reads. */
function whatHappened(item: ActivityItem, kind: ActionKind): string {
  const who = item.actorName || item.actorEmail || "Someone";
  const area = item.categoryLabel || item.category || "the app";
  const thing = humanResource(item.resourceType);
  const ref = item.resourceId
    ? ` (id ending …${String(item.resourceId).slice(-6)})`
    : "";

  if (kind === "login_failed") {
    return `${who || "Someone"} tried to sign in but it failed.`;
  }
  if (kind === "login") {
    return `${who} signed in to their ${roleLabel(item.actorRole).toLowerCase()} account.`;
  }
  if (kind === "logout") {
    return `${who} signed out.`;
  }
  if (kind === "register") {
    return `${who} registered as a ${roleLabel(item.actorRole).toLowerCase()}.`;
  }
  if (kind === "view") {
    return item.resourceType
      ? `${who} opened a ${thing} under ${area}${ref}.`
      : `${who} opened a record under ${area}.`;
  }
  if (item.summary?.toLowerCase().includes("placed")) {
    return `${who} placed a new ${thing}${ref}.`;
  }
  if (item.summary?.toLowerCase().includes("return")) {
    return `${who}: ${item.summary}.`;
  }
  if (kind === "create") {
    return item.resourceType
      ? `${who} added a new ${thing} under ${area}${ref}.`
      : `${who} added something new under ${area}.`;
  }
  if (kind === "update") {
    return item.resourceType
      ? `${who} changed a ${thing} under ${area}${ref}.`
      : `${who} changed something under ${area}.`;
  }
  if (kind === "delete") {
    return item.resourceType
      ? `${who} removed a ${thing} from ${area}${ref}.`
      : `${who} removed something from ${area}.`;
  }
  return item.summary || `${who} did something under ${area}.`;
}

export default function ActivityLogViewer() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [actorRole, setActorRole] = useState<RoleFilter>("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [live, setLive] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const firstLoadDoneRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  const roleAreas = useMemo(() => areasForRole(actorRole), [actorRole]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // When the sidebar group changes, keep only areas that group can actually do.
  useEffect(() => {
    const allowed = new Set(areasForRole(actorRole).map((a) => a.value));
    if (category && !allowed.has(category)) {
      setCategory("");
    }
  }, [actorRole, category]);

  useEffect(() => {
    setPage(1);
    knownIdsRef.current = new Set();
    firstLoadDoneRef.current = false;
    setFreshIds(new Set());
    setNewCount(0);
    setSelectedIds(new Set());
  }, [debouncedQ, category, successFilter, actorRole]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const headers = useMemo(
    () => ({
      Accept: "application/json",
      [ACTIVITY_LOG_ACCESS_HEADER]: ACTIVITY_LOG_URL_KEY,
    }),
    [],
  );

  const fetchList = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const silent = Boolean(opts.silent);
      if (fetchInFlightRef.current && silent) return;
      fetchInFlightRef.current = true;
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "40");
        if (debouncedQ) params.set("q", debouncedQ);
        if (category) params.set("category", category);
        if (successFilter) params.set("success", successFilter);
        if (actorRole) params.set("actorRole", actorRole);

        const res = await fetch(
          `${apiBase()}/api/dev/activity-log?${params.toString()}`,
          { headers, credentials: "omit", cache: "no-store" },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = json?.message || `Request failed (${res.status})`;
          // Keep showing existing rows if we were rate-limited mid-session.
          if (res.status === 429 && silent) {
            return;
          }
          throw new Error(message);
        }

        const next = json as ListResponse;
        const nextItems = next.items || [];
        const nextIds = nextItems.map((item) => item._id);

        if (!firstLoadDoneRef.current) {
          knownIdsRef.current = new Set(nextIds);
          firstLoadDoneRef.current = true;
          setFreshIds(new Set());
          setNewCount(0);
        } else if (page === 1) {
          const brandNew = nextIds.filter((id) => !knownIdsRef.current.has(id));
          if (brandNew.length) {
            setFreshIds(new Set(brandNew));
            setNewCount(brandNew.length);
            for (const id of brandNew) knownIdsRef.current.add(id);
            window.setTimeout(() => {
              setFreshIds(new Set());
              setNewCount(0);
            }, 6000);
          }
          // Keep known set bounded
          if (knownIdsRef.current.size > 400) {
            knownIdsRef.current = new Set(nextIds);
          }
        }

        setData(next);
        setLastUpdatedAt(new Date());
        if (!silent) setError("");
      } catch (err) {
        if (!silent) {
          // Prefer keeping the last good list instead of wiping the page.
          setError(
            err instanceof Error ? err.message : "Failed to load activity",
          );
        }
      } finally {
        fetchInFlightRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [page, debouncedQ, category, successFilter, actorRole, headers],
  );

  // Initial + filter/page changes
  useEffect(() => {
    void fetchList({ silent: false });
  }, [fetchList, refreshKey]);

  // Live auto-refresh while tab is visible
  useEffect(() => {
    if (!live) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void fetchList({ silent: true });
    };

    const id = window.setInterval(tick, 6000);
    const onFocus = () => tick();
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [live, fetchList]);

  const items = data?.items || [];
  const stats = data?.stats;
  const totalPages = data?.totalPages || 1;
  const activeNav = ROLE_NAV.find((n) => n.id === actorRole) || ROLE_NAV[0];
  const hasExtraFilters = Boolean(category || successFilter || q);
  const pageNumbers = buildPageList(data?.page || page, totalPages);
  const allPageSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item._id));
  const someSelected = selectedIds.size > 0;

  function selectRole(role: RoleFilter) {
    setActorRole(role);
    setSidebarOpen(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      if (items.length === 0) return prev;
      const allSelected = items.every((item) => prev.has(item._id));
      if (allSelected) {
        const next = new Set(prev);
        for (const item of items) next.delete(item._id);
        return next;
      }
      const next = new Set(prev);
      for (const item of items) next.add(item._id);
      return next;
    });
  }

  async function deleteLogs(ids: string[]) {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (!unique.length) return;

    const confirmed = window.confirm(
      unique.length === 1
        ? "Delete this activity log entry? This cannot be undone."
        : `Delete ${unique.length} activity log entries? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleteError("");
    setDeletingIds(new Set(unique));
    try {
      const res = await fetch(`${apiBase()}/api/dev/activity-log`, {
        method: "DELETE",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ ids: unique }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Delete failed (${res.status})`);
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of unique) next.delete(id);
        return next;
      });
      setFreshIds((prev) => {
        const next = new Set(prev);
        for (const id of unique) next.delete(id);
        return next;
      });
      for (const id of unique) knownIdsRef.current.delete(id);

      // If we deleted the last items on this page, step back one page.
      const remainingOnPage = items.filter((item) => !unique.includes(item._id));
      if (remainingOnPage.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        setRefreshKey((n) => n + 1);
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete activity logs",
      );
    } finally {
      setDeletingIds(new Set());
    }
  }

  async function exportLogs() {
    setExporting(true);
    setDeleteError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "2000");
      if (debouncedQ) params.set("q", debouncedQ);
      if (category) params.set("category", category);
      if (successFilter) params.set("success", successFilter);
      if (actorRole) params.set("actorRole", actorRole);

      const res = await fetch(
        `${apiBase()}/api/dev/activity-log/export?${params.toString()}`,
        {
          headers,
          credentials: "omit",
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motd-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not export activity logs",
      );
    } finally {
      setExporting(false);
    }
  }

  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const sidebar = (
    <aside className="flex h-full w-65 shrink-0 flex-col bg-[#111312] text-[#f4f2ec]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#9aa39a] [font-family:var(--font-ui)]">
          MOTD
        </p>
        <h1 className="mt-1 text-[26px] leading-none [font-family:var(--font-display)]">
          Who did what
        </h1>
        <p className="mt-2 text-[13px] leading-snug text-[#9aa39a]">
          Pick a group on the left, then read the list on the right.
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f776f]">
          Show activity for
        </p>
        {ROLE_NAV.map((item) => {
          const Icon = item.icon;
          const active = actorRole === item.id;
          return (
            <button
              key={item.id || "all"}
              type="button"
              onClick={() => selectRole(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                active
                  ? "bg-[#d8efe4] text-[#13201a]"
                  : "text-[#d7dbd6] hover:bg-white/8"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>
                <span className="block text-[14px] font-medium">{item.label}</span>
                <span
                  className={`block text-[11px] ${active ? "text-[#3d5248]" : "text-[#7e877e]"}`}
                >
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 text-[12px] text-[#9aa39a]">
        <p>
          <span className="font-semibold text-[#d8efe4]">
            {stats?.todayCount ?? 0}
          </span>{" "}
          actions today
        </p>
        <p className="mt-1">
          <span className="font-semibold text-[#d8efe4]">
            {stats?.topActors?.length ?? 0}
          </span>{" "}
          people active this week
        </p>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#f6f4ef] text-[#121412] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_select]:cursor-pointer [&_label]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]:disabled]:cursor-not-allowed [&_option]:cursor-pointer">
      <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[#e6e2d8] bg-[#f6f4ef]/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ddd7cb] bg-white lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-[24px] leading-tight [font-family:var(--font-display)] sm:text-[28px]">
                  {activeNav.label}
                </h2>
                <p className="text-[13px] text-[#6d6960]">
                  Showing{" "}
                  <strong className="font-semibold text-[#121412]">
                    {stats?.matchedCount ?? 0}
                  </strong>{" "}
                  action{(stats?.matchedCount ?? 0) === 1 ? "" : "s"}
                  {actorRole ? ` by ${activeNav.label.toLowerCase()}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLive((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium ${
                  live
                    ? "border-[#1f7a4d]/30 bg-[#e8f6ee] text-[#1f7a4d]"
                    : "border-[#e6e2d8] bg-white text-[#6d6960]"
                }`}
                title={
                  live
                    ? "Live updates are on — list refreshes every few seconds"
                    : "Live updates are off"
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    live ? "animate-pulse bg-[#1f7a4d]" : "bg-[#b0aaa0]"
                  }`}
                />
                {live ? "Live" : "Paused"}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((n) => n + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111312] px-4 py-2.5 text-[13px] font-medium text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh now
              </button>
            </div>
          </div>
          {lastUpdatedLabel ? (
            <p className="mt-1 px-4 text-[11px] text-[#8a8578] sm:px-6">
              Last updated {lastUpdatedLabel}
              {live ? " · checking for new activity every 6 seconds" : ""}
              {newCount > 0
                ? ` · ${newCount} new action${newCount === 1 ? "" : "s"} just appeared`
                : ""}
            </p>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
          {/* How to read colors — short and plain */}
          <div className="mb-4 rounded-xl border border-[#e6e2d8] bg-white px-4 py-3">
            <p className="mb-2 text-[12px] font-medium text-[#6d6960]">
              How to read this list
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["create", "Added = new item created"],
                  ["update", "Changed = existing item edited"],
                  ["delete", "Removed = item deleted"],
                  ["login", "Signed in = logged into account"],
                ] as const
              ).map(([key, text]) => (
                <span
                  key={key}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${ACTION_STYLES[key].badge}`}
                >
                  {text}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-[#e6e2d8] bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[12px] font-medium text-[#6d6960]">
                  Search
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9588]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Type a name, email, or words from the action…"
                    className="w-full rounded-xl border border-[#e6e2d8] bg-[#faf8f3] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#111312]/35 focus:bg-white focus:ring-2 focus:ring-[#111312]/10"
                  />
                </div>
              </label>
              <label className="lg:w-64">
                <span className="mb-1 block text-[12px] font-medium text-[#6d6960]">
                  {areaDropdownTitle(actorRole)}
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#e6e2d8] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#111312]/10"
                >
                  <option value="">
                    {actorRole
                      ? `All ${activeNav.label.toLowerCase()} actions`
                      : "All actions"}
                  </option>
                  {roleAreas.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lg:w-44">
                <span className="mb-1 block text-[12px] font-medium text-[#6d6960]">
                  Did it work?
                </span>
                <select
                  value={successFilter}
                  onChange={(e) => setSuccessFilter(e.target.value)}
                  className="w-full rounded-xl border border-[#e6e2d8] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#111312]/10"
                >
                  <option value="">All</option>
                  <option value="true">Yes — worked</option>
                  <option value="false">No — failed</option>
                </select>
              </label>
              {hasExtraFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setCategory("");
                    setSuccessFilter("");
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#e6e2d8] px-3 py-2.5 text-sm text-[#6d6960]"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load the list</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          ) : null}

          {deleteError ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not delete</p>
                <p className="mt-0.5">{deleteError}</p>
              </div>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-xl border border-[#e6e2d8] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efebe3] bg-[#faf8f3] px-4 py-2.5">
              <label className="inline-flex items-center gap-2 text-[12px] text-[#6d6960]">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAllOnPage}
                  disabled={!items.length || deletingIds.size > 0}
                  className="h-4 w-4 rounded border-[#cfc9bc]"
                />
                Select all on this page
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={exporting || loading}
                  onClick={() => void exportLogs()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e2d8] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2a2a28] disabled:opacity-40"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Export CSV
                </button>
                <button
                  type="button"
                  disabled={!someSelected || deletingIds.size > 0}
                  onClick={() => void deleteLogs(Array.from(selectedIds))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#c23b3b] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
                >
                  {deletingIds.size > 0 ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete selected
                  {someSelected ? ` (${selectedIds.size})` : ""}
                </button>
              </div>
            </div>

            {/* Desktop table header */}
            <div className="hidden border-b border-[#efebe3] bg-[#faf8f3] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a766c] md:grid md:grid-cols-[2rem_8.5rem_10rem_6rem_minmax(0,1fr)_6rem_2.75rem] md:gap-3">
              <div />
              <div>Time of action</div>
              <div>Person involved</div>
              <div>Type of change</div>
              <div>Description</div>
              <div>Outcome</div>
              <div className="text-right">Delete</div>
            </div>

            <div className="divide-y divide-[#efebe3]">
              {loading && !items.length ? (
                <div className="px-4 py-16 text-center text-[#7a766c]">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : null}

              {!loading && !items.length ? (
                <div className="px-4 py-16 text-center">
                  <p className="text-[20px] [font-family:var(--font-display)]">
                    Nothing to show
                  </p>
                  <p className="mt-1 text-sm text-[#7a766c]">
                    Try another group on the left, or clear your filters.
                  </p>
                </div>
              ) : null}

              {items.map((item) => {
                const when = formatWhen(item.createdAt);
                const kind = resolveActionKind(item);
                const style = ACTION_STYLES[kind];
                const failed = item.success === false;
                const sentence = whatHappened(item, kind);
                const isFresh = freshIds.has(item._id);
                const isSelected = selectedIds.has(item._id);
                const isDeleting = deletingIds.has(item._id);
                const isExpanded = expandedId === item._id;

                return (
                  <div
                    key={item._id}
                    className={`border-l-4 ${
                      failed
                        ? "border-l-[#c23b3b] bg-[#fff5f5]"
                        : style.row
                    } ${isFresh ? "ring-2 ring-inset ring-[#1f7a4d]/35" : ""} ${
                      isSelected ? "ring-1 ring-inset ring-[#111312]/20" : ""
                    }`}
                  >
                    <div className="px-4 py-3.5 md:grid md:grid-cols-[2rem_8.5rem_10rem_6rem_minmax(0,1fr)_6rem_2.75rem] md:items-start md:gap-3">
                    <div className="mb-2 flex items-center gap-2 md:mb-0 md:pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item._id)}
                        disabled={isDeleting}
                        className="h-4 w-4 rounded border-[#cfc9bc]"
                        aria-label="Select this activity log"
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Select
                      </span>
                    </div>

                    {/* Time of action */}
                    <div className="mb-2 md:mb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Time of action
                      </p>
                      {isFresh ? (
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1f7a4d]">
                          Just now · new
                        </p>
                      ) : null}
                      <p className="text-[13px] font-semibold text-[#121412]">
                        {when.relative}
                      </p>
                      <p className="text-[11px] text-[#7a766c]">
                        {when.day} · {when.time}
                      </p>
                    </div>

                    {/* Person involved */}
                    <div className="mb-2 md:mb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Person involved
                      </p>
                      <p className="truncate text-[13px] font-semibold text-[#121412]">
                        {item.actorName || "Unknown person"}
                      </p>
                      <p className="text-[11px] font-medium text-[#1c2b24]">
                        {roleLabel(item.actorRole)}
                      </p>
                      <p className="truncate text-[11px] text-[#7a766c]">
                        {item.actorEmail || "No email"}
                      </p>
                    </div>

                    {/* Type of change */}
                    <div className="mb-2 md:mb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Type of change
                      </p>
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${
                          failed ? "bg-[#c23b3b] text-white" : style.badge
                        }`}
                      >
                        {failed ? "Failed" : style.label}
                      </span>
                      <p className="mt-1 text-[10px] leading-snug text-[#8a8578]">
                        {style.meaning}
                      </p>
                    </div>

                    {/* Description */}
                    <div className="mb-2 min-w-0 md:mb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Description
                      </p>
                      <p className="text-[14px] leading-relaxed text-[#1a1a18]">
                        {sentence}
                      </p>
                      <p className="mt-1 text-[11px] text-[#8a8578]">
                        Section:{" "}
                        <span className="font-medium text-[#4a4a46]">
                          {item.categoryLabel || item.category || "General"}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === item._id ? null : item._id,
                          )
                        }
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#6d6960] hover:text-[#121412]"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        {isExpanded ? "Hide details" : "Show details"}
                      </button>
                    </div>

                    {/* Outcome */}
                    <div className="mb-2 md:mb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9588] md:hidden">
                        Outcome
                      </p>
                      {failed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#c23b3b] px-2 py-1 text-[11px] font-semibold text-white">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Did not work
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1f7a4d]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Worked
                        </span>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="flex md:justify-end">
                      <button
                        type="button"
                        title="Delete this log"
                        disabled={isDeleting || deletingIds.size > 0}
                        onClick={() => void deleteLogs([item._id])}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e6e2d8] text-[#c23b3b] transition hover:bg-[#fff5f5] disabled:opacity-40"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    </div>

                    {isExpanded ? (
                      <div className="border-t border-[#efebe3]/80 bg-white/60 px-4 py-3 text-[12px] text-[#4a4a46]">
                        <div className="grid gap-2 md:grid-cols-2">
                          <p>
                            <span className="font-semibold text-[#7a766c]">
                              Path:{" "}
                            </span>
                            <span className="break-all font-mono text-[11px]">
                              {item.path || "—"}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-[#7a766c]">
                              IP:{" "}
                            </span>
                            {item.ip || "—"}
                            {item.statusCode != null
                              ? ` · HTTP ${item.statusCode}`
                              : ""}
                          </p>
                          <p className="md:col-span-2">
                            <span className="font-semibold text-[#7a766c]">
                              Device:{" "}
                            </span>
                            <span className="break-all text-[11px]">
                              {item.userAgent || "—"}
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efebe3] px-4 py-3">
              <p className="text-[12px] text-[#7a766c]">
                Page {data?.page || page} of {totalPages}
                {typeof data?.total === "number"
                  ? ` · ${data.total} total`
                  : ""}
                {someSelected ? ` · ${selectedIds.size} selected` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#e6e2d8] px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                {pageNumbers.map((entry, idx) =>
                  entry === "…" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-sm text-[#9a9588]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={entry}
                      type="button"
                      disabled={loading}
                      onClick={() => setPage(entry)}
                      className={`min-w-9 rounded-xl px-2.5 py-1.5 text-sm ${
                        entry === (data?.page || page)
                          ? "bg-[#111312] font-semibold text-white"
                          : "border border-[#e6e2d8] text-[#2a2a28] hover:bg-[#faf8f3]"
                      }`}
                    >
                      {entry}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#e6e2d8] px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {stats?.topActors?.length ? (
            <section className="mt-5 rounded-xl border border-[#e6e2d8] bg-white p-4">
              <h3 className="text-[18px] [font-family:var(--font-display)]">
                Busiest people this week
              </h3>
              <p className="mb-3 text-[12px] text-[#7a766c]">
                Ranked by how many actions they took
              </p>
              <ol className="space-y-2">
                {stats.topActors.slice(0, 8).map((actor, i) => (
                  <li
                    key={actor.email}
                    className="flex items-center justify-between rounded-lg bg-[#f8f6f1] px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#111312] text-[10px] font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="font-medium">
                        {actor.name || actor.email}
                      </span>
                      <span className="text-[#7a766c]">
                        {" "}
                        · {roleLabel(actor.role)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {actor.count} action{actor.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
