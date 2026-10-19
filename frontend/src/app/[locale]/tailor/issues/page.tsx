"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api/client";
import GlobalPagination from "@/components/shared/GlobalPagination";

type IssueTimeframe = "" | "today" | "week" | "month" | "year";

type PartnerIssueKind = "fabric_insufficient" | "fabric_damaged" | "other" | "";

type OrderOption = {
  _id: string;
  publicOrderId?: string | null;
  status?: string;
  createdAt?: string;
};

type IssueItem = {
  id: string;
  referenceNumber: string;
  publicOrderId: string;
  partnerIssueKind: string;
  concern: string;
  status: string;
  createdAt?: string;
};

type StatusCounts = {
  new: number;
  contacted: number;
  closed: number;
  all: number;
};

const ISSUE_KIND_LABELS: Record<string, { en: string; ar: string }> = {
  fabric_insufficient: {
    en: "Fabric not enough",
    ar: "القماش غير كافٍ",
  },
  fabric_damaged: {
    en: "Fabric damaged / unsuitable",
    ar: "القماش تالف / غير مناسب",
  },
  other: {
    en: "Something else",
    ar: "شيء آخر",
  },
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" },
  contacted: { en: "In review", ar: "قيد المراجعة" },
  closed: { en: "Closed", ar: "مغلق" },
};

const TOAST = {
  duration: 4000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    borderRadius: "0",
  },
};

export default function TailorIssuesPage() {
  const params = useParams();
  const isAr = params.locale === "ar";

  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [orderId, setOrderId] = useState("");
  const [partnerIssueKind, setPartnerIssueKind] = useState<PartnerIssueKind>("");
  const [concern, setConcern] = useState("");

  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKind, setFilterKind] = useState("");
  const [filterTimeframe, setFilterTimeframe] = useState<IssueTimeframe>("");
  const [counts, setCounts] = useState<StatusCounts>({
    new: 0,
    contacted: 0,
    closed: 0,
    all: 0,
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filterSearch.trim() || filterStatus || filterKind || filterTimeframe,
      ),
    [filterSearch, filterStatus, filterKind, filterTimeframe],
  );

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get<{ success: boolean; items: OrderOption[] }>(
        "/api/tailor/orders?page=1&limit=100",
      );
      setOrders(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          isAr ? "تعذر تحميل الطلبات" : "Failed to load orders",
        ),
        TOAST,
      );
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [isAr]);

  const loadIssues = useCallback(
    async (opts?: { page?: number; showLoading?: boolean }) => {
      const nextPage = Math.max(1, opts?.page ?? 1);
      const showLoading = opts?.showLoading !== false;
      if (showLoading) setLoadingIssues(true);
      try {
        const query = new URLSearchParams();
        query.set("page", String(nextPage));
        query.set("limit", "20");
        if (filterSearch.trim()) query.set("search", filterSearch.trim());
        if (filterStatus) query.set("status", filterStatus);
        if (filterKind) query.set("kind", filterKind);
        if (filterTimeframe) query.set("timeframe", filterTimeframe);

        const res = await api.get<{
          success: boolean;
          items: IssueItem[];
          total?: number;
          totalPages?: number;
          page?: number;
          counts?: StatusCounts;
        }>(`/api/tailor/issues?${query.toString()}`);

        setPage(nextPage);
        setIssues(Array.isArray(res?.items) ? res.items : []);
        setTotal(Number(res?.total) || 0);
        setTotalPages(Number(res?.totalPages) || 0);
        if (res?.counts) {
          setCounts({
            new: Number(res.counts.new) || 0,
            contacted: Number(res.counts.contacted) || 0,
            closed: Number(res.counts.closed) || 0,
            all: Number(res.counts.all) || 0,
          });
        }
      } catch (err) {
        toast.error(
          getApiErrorMessage(
            err,
            isAr ? "تعذر تحميل البلاغات" : "Failed to load issues",
          ),
          TOAST,
        );
        setIssues([]);
      } finally {
        if (showLoading) setLoadingIssues(false);
      }
    },
    [isAr, filterSearch, filterStatus, filterKind, filterTimeframe],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      void loadIssues({ page: 1, showLoading: true });
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      void loadIssues({ page: 1, showLoading: false });
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [loadIssues]);

  const clearFilters = () => {
    setFilterSearch("");
    setFilterStatus("");
    setFilterKind("");
    setFilterTimeframe("");
  };

  const submitIssue = async () => {
    setError("");
    if (!orderId) {
      setError(isAr ? "يرجى اختيار طلب." : "Please select an order.");
      return;
    }
    if (!partnerIssueKind) {
      setError(isAr ? "يرجى اختيار نوع المشكلة." : "Please select an issue type.");
      return;
    }
    const text = concern.trim();
    if (text.length < 10) {
      setError(
        isAr
          ? "يرجى وصف المشكلة (10 أحرف على الأقل)."
          : "Please describe the issue (at least 10 characters).",
      );
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{
        success: boolean;
        referenceNumber: string;
      }>("/api/tailor/issues", {
        orderId,
        partnerIssueKind,
        concern: text,
        locale: isAr ? "ar" : "en",
      });
      toast.success(
        isAr
          ? `تم إرسال البلاغ. المرجع: ${data.referenceNumber}`
          : `Issue submitted. Reference: ${data.referenceNumber}`,
        TOAST,
      );
      setOrderId("");
      setPartnerIssueKind("");
      setConcern("");
      await loadIssues({ page: 1, showLoading: true });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          isAr ? "تعذر إرسال البلاغ." : "Failed to submit issue.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const orderLabel = (o: OrderOption) => {
    const id = o.publicOrderId || o._id.slice(-8);
    const status = o.status ? ` · ${o.status.replace(/_/g, " ")}` : "";
    return `${id}${status}`;
  };

  const statusBadgeClass = (status: string) => {
    if (status === "closed") return "border-gray-200 bg-gray-50 text-gray-600";
    if (status === "contacted")
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    return "border-amber-200 bg-amber-50 text-amber-900";
  };

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="[font-family:var(--font-display)] text-2xl sm:text-3xl text-black">
          {isAr ? "الإبلاغ عن مشكلة" : "Report an issue"}
        </h1>
        <p className="mt-2 text-sm text-gray-500 text-justify [font-family:var(--font-body)] leading-relaxed">
          {isAr
            ? "إذا استلمتِ قماش العميل وكان غير كافٍ أو تالفاً، أبلغي MOTD هنا. فريق الرعاية يتواصل مع العميل — لا تتواصلي مع العميل مباشرة."
            : "If customer fabric arrives short or damaged, report it here. MOTD Care contacts the customer — do not contact the customer directly."}
        </p>
      </div>

      <div className="border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400">
            {isAr ? "الطلب" : "Order"}
          </span>
          <select
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              setError("");
            }}
            disabled={loadingOrders || submitting}
            className="border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black disabled:opacity-60"
          >
            <option value="">
              {loadingOrders
                ? isAr
                  ? "جاري التحميل…"
                  : "Loading…"
                : isAr
                  ? "اختاري طلباً"
                  : "Select an order"}
            </option>
            {orders.map((o) => (
              <option key={o._id} value={o._id}>
                {orderLabel(o)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400">
            {isAr ? "نوع المشكلة" : "Issue type"}
          </span>
          <select
            value={partnerIssueKind}
            onChange={(e) => {
              setPartnerIssueKind(e.target.value as PartnerIssueKind);
              setError("");
            }}
            disabled={submitting}
            className="border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black disabled:opacity-60"
          >
            <option value="">
              {isAr ? "اختاري النوع" : "Select issue type"}
            </option>
            {(
              Object.keys(ISSUE_KIND_LABELS) as Array<
                keyof typeof ISSUE_KIND_LABELS
              >
            ).map((key) => (
              <option key={key} value={key}>
                {isAr ? ISSUE_KIND_LABELS[key].ar : ISSUE_KIND_LABELS[key].en}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400">
            {isAr ? "التفاصيل" : "Details"}
          </span>
          <textarea
            value={concern}
            onChange={(e) => {
              setConcern(e.target.value);
              setError("");
            }}
            disabled={submitting}
            rows={5}
            maxLength={2000}
            placeholder={
              isAr
                ? "صفي ما استلمتِه (مثلاً: القماش أقل من المطلوب بمترين، أو القماش ملطّخ…)"
                : "Describe what you received (e.g. fabric is 2m short, fabric stained…)"
            }
            className="border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-black disabled:opacity-60 resize-y"
          />
        </label>

        {error ? (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitIssue()}
            className="inline-flex items-center px-4 py-2.5 text-xs uppercase tracking-wider bg-black text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {submitting ? "…" : "SUBMIT REQUEST"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="[font-family:var(--font-display)] text-xl text-black">
              {isAr ? "بلاغاتك" : "Your reports"}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {isAr
                ? `${total} نتيجة`
                : `${total} result${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadIssues({ page, showLoading: true })}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-xs hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
                {isAr ? "البحث" : "Search"}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder={
                    isAr
                      ? "المرجع، الطلب، أو التفاصيل…"
                      : "Ref, order, or details…"
                  }
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
                {isAr ? "الحالة" : "Status"}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
              >
                <option value="">
                  {isAr
                    ? `كل الحالات (${counts.all})`
                    : `All statuses (${counts.all})`}
                </option>
                <option value="new">
                  {isAr
                    ? `${STATUS_LABELS.new.ar} (${counts.new})`
                    : `${STATUS_LABELS.new.en} (${counts.new})`}
                </option>
                <option value="contacted">
                  {isAr
                    ? `${STATUS_LABELS.contacted.ar} (${counts.contacted})`
                    : `${STATUS_LABELS.contacted.en} (${counts.contacted})`}
                </option>
                <option value="closed">
                  {isAr
                    ? `${STATUS_LABELS.closed.ar} (${counts.closed})`
                    : `${STATUS_LABELS.closed.en} (${counts.closed})`}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
                {isAr ? "نوع المشكلة" : "Issue type"}
              </label>
              <select
                value={filterKind}
                onChange={(e) => setFilterKind(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
              >
                <option value="">
                  {isAr ? "كل الأنواع" : "All types"}
                </option>
                {(
                  Object.keys(ISSUE_KIND_LABELS) as Array<
                    keyof typeof ISSUE_KIND_LABELS
                  >
                ).map((key) => (
                  <option key={key} value={key}>
                    {isAr
                      ? ISSUE_KIND_LABELS[key].ar
                      : ISSUE_KIND_LABELS[key].en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
                {isAr ? "الفترة" : "Period"}
              </label>
              <select
                value={filterTimeframe}
                onChange={(e) =>
                  setFilterTimeframe(e.target.value as IssueTimeframe)
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
              >
                <option value="">
                  {isAr ? "كل الفترات" : "All time"}
                </option>
                <option value="today">{isAr ? "اليوم" : "Today"}</option>
                <option value="week">{isAr ? "هذا الأسبوع" : "This week"}</option>
                <option value="month">{isAr ? "هذا الشهر" : "This month"}</option>
                <option value="year">{isAr ? "هذه السنة" : "This year"}</option>
              </select>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {isAr ? "عوامل التصفية نشطة" : "Filters applied"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition"
              >
                <X className="w-3.5 h-3.5" />
                {isAr ? "مسح الكل" : "Clear all"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden">
          {loadingIssues ? (
            <p className="p-5 text-sm text-gray-500">
              {isAr ? "جاري التحميل…" : "Loading…"}
            </p>
          ) : issues.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-sm text-gray-500">
                {hasActiveFilters
                  ? isAr
                    ? "لا توجد بلاغات مطابقة لعوامل التصفية."
                    : "No reports match your filters."
                  : isAr
                    ? "لا توجد بلاغات بعد."
                    : "No reports yet."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-black hover:underline"
                >
                  <X className="w-3.5 h-3.5" />
                  {isAr ? "مسح عوامل التصفية" : "Clear filters"}
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {issues.map((item) => {
                const kind =
                  ISSUE_KIND_LABELS[item.partnerIssueKind] ||
                  ISSUE_KIND_LABELS.other;
                const st = STATUS_LABELS[item.status] || STATUS_LABELS.new;
                return (
                  <li key={item.id} className="p-4 sm:p-5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${statusBadgeClass(item.status)}`}
                      >
                        {isAr ? st.ar : st.en}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider border border-gray-200 px-2 py-0.5 text-gray-600">
                        {isAr ? kind.ar : kind.en}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString(
                              isAr ? "ar-AE" : "en-GB",
                            )
                          : ""}
                      </span>
                    </div>
                    <p className="text-sm text-black">
                      <span className="text-gray-400 text-xs uppercase tracking-wider me-2">
                        {isAr ? "المرجع" : "Ref"}
                      </span>
                      {item.referenceNumber}
                    </p>
                    <p className="text-sm text-black">
                      <span className="text-gray-400 text-xs uppercase tracking-wider me-2">
                        {isAr ? "الطلب" : "Order"}
                      </span>
                      {item.publicOrderId || "—"}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {item.concern}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 ? (
          <GlobalPagination
            currentPage={Math.max(page, 1)}
            totalPages={Math.max(totalPages, 1)}
            onPageChange={(next) => {
              void loadIssues({ page: next, showLoading: true });
            }}
            totalItems={total}
          />
        ) : null}
      </div>
    </div>
  );
}
