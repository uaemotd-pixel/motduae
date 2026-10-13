"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Mail, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api/client";
import GlobalPagination from "@/components/shared/GlobalPagination";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type QueryStatus = "new" | "contacted" | "closed";
type QueryListFilter = QueryStatus | "all";
type CategoryFilter = "all" | "general" | "damage_claim" | "tailor_issue";

type SupportQuery = {
  id: string;
  referenceNumber: string;
  name: string;
  email: string;
  concern: string;
  category?: "general" | "damage_claim" | "tailor_issue";
  publicOrderId?: string;
  orderType?: "custom" | "retail" | "";
  damageKind?: string;
  partnerIssueKind?: string;
  source?: string;
  locale?: string;
  status: QueryStatus;
  createdAt: string;
};

const DAMAGE_KIND_LABELS: Record<string, string> = {
  torn: "Torn / ripped",
  stained: "Stained / dirty",
  missing_parts: "Missing parts / incomplete",
  wrong_item: "Wrong item received",
  packaging_damaged: "Damaged packaging",
  other: "Something else",
};

const PARTNER_ISSUE_LABELS: Record<string, string> = {
  fabric_insufficient: "Fabric not enough",
  fabric_damaged: "Fabric damaged / unsuitable",
  other: "Something else",
};

type Counts = {
  new: number;
  contacted: number;
  closed: number;
  all: number;
};

type CategoryCounts = {
  all: number;
  general: number;
  damage_claim: number;
  tailor_issue: number;
};

const TOAST = {
  duration: 4000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    borderRadius: "0",
  },
};

function mailtoHref(
  email: string,
  reference: string,
  category?: string,
  publicOrderId?: string,
) {
  const kind =
    category === "damage_claim"
      ? "damage claim"
      : category === "tailor_issue"
        ? "tailor issue"
        : "support";
  const orderBit = publicOrderId ? ` ${publicOrderId}` : "";
  const subject = encodeURIComponent(
    reference
      ? `MOTD ${kind} ${reference}${orderBit}`
      : `MOTD ${kind}${orderBit}`,
  );
  return `mailto:${email}?subject=${subject}`;
}

function readCategoryFilter(value: string | null): CategoryFilter {
  if (
    value === "general" ||
    value === "damage_claim" ||
    value === "tailor_issue"
  ) {
    return value;
  }
  return "all";
}

function categoryBadge(category?: string) {
  if (category === "damage_claim") {
    return (
      <span className="inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border border-red-200 bg-red-50 text-red-800">
        Damage claim
      </span>
    );
  }
  if (category === "tailor_issue") {
    return (
      <span className="inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border border-orange-200 bg-orange-50 text-orange-900">
        Tailor issue
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border border-gray-200 bg-gray-50 text-gray-600">
      General
    </span>
  );
}

async function copyEmail(email: string) {
  await navigator.clipboard.writeText(email);
}

function readListFilter(value: string | null): QueryListFilter {
  if (value === "contacted" || value === "closed" || value === "all") return value;
  return "new";
}

export default function AdminQueriesPage() {
  const searchParams = useSearchParams();
  const urlStatus = readListFilter(searchParams.get("status"));
  const urlCategory = readCategoryFilter(searchParams.get("category"));
  const urlSearch = searchParams.get("search") || "";

  const [status, setStatus] = useState<QueryListFilter>(urlStatus);
  const [category, setCategory] = useState<CategoryFilter>(urlCategory);
  const [search, setSearch] = useState(urlSearch);
  const [items, setItems] = useState<SupportQuery[]>([]);
  const [counts, setCounts] = useState<Counts>({
    new: 0,
    contacted: 0,
    closed: 0,
    all: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    all: 0,
    general: 0,
    damage_claim: 0,
    tailor_issue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStatus(urlStatus);
    setCategory(urlCategory);
    setSearch(urlSearch);
    setPage(1);
  }, [urlStatus, urlCategory, urlSearch]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("category", category);
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search.trim()) params.set("search", search.trim());
      const data = await api.get<{
        success: boolean;
        items: SupportQuery[];
        counts: Counts;
        categoryCounts?: CategoryCounts;
        total?: number;
        totalPages?: number;
      }>(`/api/admin/queries?${params.toString()}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      if (data?.counts) setCounts(data.counts);
      if (data?.categoryCounts) setCategoryCounts(data.categoryCounts);
      setTotal(Number(data?.total) || 0);
      setTotalPages(Number(data?.totalPages) || 0);
      window.dispatchEvent(new Event("motd-queries-count-refresh"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load queries"), TOAST);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, category, search, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [status, category, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const setQueryStatus = async (id: string, next: QueryStatus) => {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/queries/${id}/status`, { status: next });
      toast.success(
        next === "contacted"
          ? "Marked as contacted."
          : next === "closed"
            ? "Marked as closed."
            : "Marked as new.",
        TOAST,
      );
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status"), TOAST);
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (value: QueryStatus) => {
    const styles =
      value === "closed"
        ? "bg-gray-100 text-gray-600 border-gray-200"
        : value === "contacted"
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-amber-50 text-amber-800 border-amber-200";
    const label =
      value === "contacted" ? "Contacted" : value === "closed" ? "Closed" : "New";
    return (
      <span
        className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border ${styles}`}
      >
        {label}
      </span>
    );
  };

  const statusActions: { key: QueryStatus; label: string; primary?: boolean }[] = [
    { key: "new", label: "Mark new" },
    { key: "contacted", label: "Mark contacted", primary: true },
    { key: "closed", label: "Mark closed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="[font-family:var(--font-display)] text-2xl sm:text-3xl text-black">
          Queries
        </h1>
        <p className="mt-1 text-sm text-gray-500 [font-family:var(--font-body)]">
          Support requests, damage claims, and tailor fabric issues.
        </p>
      </div>

      <div className="bg-white border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            htmlFor="queries-type"
            className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5"
          >
            Type
          </label>
          <select
            id="queries-type"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value as CategoryFilter);
            }}
            className="w-full border border-gray-200 px-3 py-2 text-sm bg-white text-black focus:outline-none focus:border-black"
          >
            <option value="all">All types ({categoryCounts.all})</option>
            <option value="general">General ({categoryCounts.general})</option>
            <option value="damage_claim">
              Damage claims ({categoryCounts.damage_claim})
            </option>
            <option value="tailor_issue">
              Tailor issues ({categoryCounts.tailor_issue})
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="queries-status"
            className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5"
          >
            Status
          </label>
          <select
            id="queries-status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as QueryListFilter);
            }}
            className="w-full border border-gray-200 px-3 py-2 text-sm bg-white text-black focus:outline-none focus:border-black"
          >
            <option value="new">New ({counts.new})</option>
            <option value="contacted">Contacted ({counts.contacted})</option>
            <option value="closed">Closed ({counts.closed})</option>
            <option value="all">All statuses ({counts.all})</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="queries-search"
            className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5"
          >
            Search
          </label>
          <div className="flex gap-2 items-stretch">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="queries-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, reference, or Order ID"
                className="w-full border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-black"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 hover:text-black hover:border-black shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading queries…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            {search.trim()
              ? "No matching queries."
              : status === "all" && category === "all"
                ? "No queries yet."
                : "No queries in this filter."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => {
              const concern = item.concern?.trim() || "";
              const isLong = concern.length > 180;
              const isOpen = Boolean(expanded[item.id]);
              return (
                <li key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(item.status)}
                        {categoryBadge(item.category)}
                        {item.source === "tailor_portal" ? (
                          <span className="inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border border-gray-200 text-gray-500">
                            Tailor portal
                          </span>
                        ) : null}
                        <span className="text-xs text-gray-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-gray-400">
                            Reference
                          </dt>
                          <dd className="mt-0.5 text-sm text-black break-all">
                            {item.referenceNumber || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-gray-400">
                            Order ID
                          </dt>
                          <dd className="mt-0.5 text-sm text-black break-all">
                            {item.publicOrderId || "—"}
                            {item.orderType ? (
                              <span className="ml-1 text-[10px] uppercase tracking-wider text-gray-400">
                                ({item.orderType === "custom" ? "custom" : "ready-made"})
                              </span>
                            ) : null}
                          </dd>
                        </div>
                        {item.category === "tailor_issue" ||
                        item.category === "damage_claim" ? (
                          <div>
                            <dt className="text-[10px] uppercase tracking-wider text-gray-400">
                              {item.category === "tailor_issue"
                                ? "Issue type"
                                : "Damage kind"}
                            </dt>
                            <dd className="mt-0.5 text-sm text-black break-words">
                              {item.category === "tailor_issue"
                                ? item.partnerIssueKind
                                  ? PARTNER_ISSUE_LABELS[item.partnerIssueKind] ||
                                    item.partnerIssueKind
                                  : "—"
                                : item.damageKind
                                  ? DAMAGE_KIND_LABELS[item.damageKind] ||
                                    item.damageKind
                                  : "—"}
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-gray-400">
                            Name
                          </dt>
                          <dd className="mt-0.5 text-sm text-black break-words">
                            {item.name || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-wider text-gray-400">
                            Email
                          </dt>
                          <dd className="mt-0.5 text-sm text-black">
                            {item.email ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={mailtoHref(
                                    item.email,
                                    item.referenceNumber,
                                    item.category,
                                    item.publicOrderId,
                                  )}
                                  className="inline-flex min-w-0 items-center gap-1.5 break-all underline underline-offset-2 hover:text-black"
                                >
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="break-all">{item.email}</span>
                                </a>
                                <button
                                  type="button"
                                  aria-label="Copy email"
                                  title="Copy email"
                                  onClick={() => {
                                    void copyEmail(item.email)
                                      .then(() => {
                                        toast.success("Email copied", TOAST);
                                      })
                                      .catch(() => {
                                        toast.error(
                                          "Could not copy the email",
                                          TOAST,
                                        );
                                      });
                                  }}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-gray-200 text-gray-600 hover:border-black hover:text-black"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              "—"
                            )}
                          </dd>
                        </div>
                      </dl>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">
                          {item.category === "tailor_issue" ? "Details" : "Concern"}
                        </p>
                        <p
                          className={`mt-0.5 text-sm text-gray-800 whitespace-pre-wrap break-words ${
                            isLong && !isOpen ? "line-clamp-3" : ""
                          }`}
                        >
                          {concern || "—"}
                        </p>
                        {isLong ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="mt-1 text-[11px] uppercase tracking-wider text-gray-500 hover:text-black"
                          >
                            {isOpen ? "Show less" : "Show full concern"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {statusActions
                        .filter((action) => action.key !== item.status)
                        .map((action) => (
                          <button
                            key={action.key}
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void setQueryStatus(item.id, action.key)}
                            className={
                              action.primary
                                ? "inline-flex items-center px-3 py-1.5 text-xs uppercase tracking-wider bg-black text-white disabled:opacity-50"
                                : "inline-flex items-center px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-200 text-gray-700 hover:border-black disabled:opacity-50"
                            }
                          >
                            {action.label}
                          </button>
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <GlobalPagination
        currentPage={Math.max(page, 1)}
        totalPages={Math.max(totalPages, 1)}
        onPageChange={setPage}
        showItemsPerPage
        itemsPerPage={limit}
        onItemsPerPageChange={(next) => {
          const allowed = PAGE_SIZE_OPTIONS.includes(next) ? next : 20;
          setPage(1);
          setLimit(allowed);
        }}
        itemsPerPageOptions={PAGE_SIZE_OPTIONS}
        totalItems={total}
      />
    </div>
  );
}
