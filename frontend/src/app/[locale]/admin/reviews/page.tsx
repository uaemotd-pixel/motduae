"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import {
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  Star,
  X,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";

type ReviewStatus = "pending" | "approved" | "rejected";

type AdminReview = {
  id: string;
  customerId: string;
  customerName: string;
  rating: number;
  quoteEn: string;
  quoteAr: string;
  titleEn: string;
  titleAr: string;
  status: ReviewStatus;
  productKind?: string;
  productName: string;
  productNameAr: string;
  orderType?: string;
  createdAt: string;
};

type Counts = {
  pending: number;
  approved: number;
  rejected: number;
  all: number;
};

const TOAST = {
  duration: 4000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    borderRadius: "0",
  },
};

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [items, setItems] = useState<AdminReview[]>([]);
  const [counts, setCounts] = useState<Counts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [editTarget, setEditTarget] = useState<AdminReview | null>(null);
  const [editForm, setEditForm] = useState({
    rating: 5,
    quoteEn: "",
    quoteAr: "",
    titleEn: "",
    titleAr: "",
    status: "pending" as ReviewStatus,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      const data = await api.get<{
        success: boolean;
        items: AdminReview[];
        counts: Counts;
        totalPages?: number;
      }>(`/api/admin/reviews?${params.toString()}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      if (data?.counts) setCounts(data.counts);
      setTotalPages(Number(data?.totalPages) || 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load reviews"), TOAST);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const setReviewStatus = async (id: string, next: ReviewStatus) => {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/reviews/${id}/status`, { status: next });
      toast.success(
        next === "approved"
          ? "Review approved — now visible on the site."
          : next === "rejected"
            ? "Review rejected."
            : "Review set to pending.",
        TOAST,
      );
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status"), TOAST);
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (rev: AdminReview) => {
    setEditTarget(rev);
    setEditForm({
      rating: Number(rev.rating) || 5,
      quoteEn: rev.quoteEn || "",
      quoteAr: rev.quoteAr || "",
      titleEn: rev.titleEn || "",
      titleAr: rev.titleAr || "",
      status: rev.status || "pending",
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.quoteEn.trim() && !editForm.quoteAr.trim()) {
      toast.error("Review comment is required", TOAST);
      return;
    }
    setBusyId(editTarget.id);
    try {
      await api.put(`/api/admin/reviews/${editTarget.id}`, {
        rating: editForm.rating,
        quoteEn: editForm.quoteEn.trim(),
        quoteAr: editForm.quoteAr.trim(),
        titleEn: editForm.titleEn.trim(),
        titleAr: editForm.titleAr.trim(),
        status: editForm.status,
      });
      toast.success("Review updated", TOAST);
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update review"), TOAST);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api.delete(`/api/admin/reviews/${deleteTarget.id}`);
      toast.success("Review deleted", TOAST);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete review"), TOAST);
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: ReviewStatus | "all"; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "approved", label: `Approved (${counts.approved})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
  ];

  const statusBadge = (s: ReviewStatus) => {
    const styles =
      s === "approved"
        ? "bg-green-50 text-green-700 border-green-200"
        : s === "rejected"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-amber-50 text-amber-800 border-amber-200";
    return (
      <span
        className={`inline-flex px-2 py-0.5 text-[10px] uppercase tracking-wider border ${styles}`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="[font-family:var(--font-display)] text-2xl sm:text-3xl text-black">
            Reviews
          </h1>
          <p className="mt-1 text-sm text-gray-500 [font-family:var(--font-body)]">
            Approve reviews before they appear on the homepage and product
            pages.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(tab.key);
              }}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider border transition ${
                status === tab.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-200 hover:border-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name…"
            className="w-full border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-black"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading reviews…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No reviews in this filter.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((rev) => (
              <li key={rev.id} className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(rev.status)}
                      <span className="text-sm font-medium text-black">
                        {rev.customerName || "Customer"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3.5 h-3.5 fill-black stroke-black" />
                        {Number(rev.rating).toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {(rev.productName || rev.productNameAr) && (
                      <p className="text-xs text-gray-500">
                        {rev.productKind === "design"
                          ? "Design: "
                          : rev.productKind === "fabric"
                            ? "Fabric: "
                            : rev.productKind === "addon"
                              ? "Add-on: "
                              : rev.orderType === "custom" ||
                                  rev.productKind === "custom"
                                ? "Custom order: "
                                : "Product: "}
                        {rev.productName || rev.productNameAr}
                      </p>
                    )}
                    <p className="text-sm text-gray-800 italic">
                      &ldquo;{rev.quoteEn || rev.quoteAr}&rdquo;
                    </p>
                    {rev.quoteAr && rev.quoteAr !== rev.quoteEn ? (
                      <p className="text-sm text-gray-600 italic" dir="rtl">
                        &ldquo;{rev.quoteAr}&rdquo;
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {rev.status !== "approved" && (
                      <button
                        type="button"
                        disabled={busyId === rev.id}
                        onClick={() => void setReviewStatus(rev.id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider bg-black text-white disabled:opacity-50"
                        title="Approve"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}
                    {rev.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busyId === rev.id}
                        onClick={() => void setReviewStatus(rev.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-200 text-gray-700 hover:border-black disabled:opacity-50"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === rev.id}
                      onClick={() => openEdit(rev)}
                      className="p-2 border border-gray-200 hover:border-black disabled:opacity-50"
                      title="Edit"
                      aria-label="Edit review"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === rev.id}
                      onClick={() => setDeleteTarget(rev)}
                      className="p-2 border border-gray-200 text-red-600 hover:border-red-600 disabled:opacity-50"
                      title="Delete"
                      aria-label="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-200 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs uppercase tracking-wider border border-gray-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-lg border border-gray-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg [font-family:var(--font-display)]">
                Edit review
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block text-xs uppercase tracking-wider text-gray-600">
              Rating
              <input
                type="number"
                min={1}
                max={5}
                step={0.5}
                value={editForm.rating}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    rating: Number(e.target.value),
                  }))
                }
                className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs uppercase tracking-wider text-gray-600">
              Status
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    status: e.target.value as ReviewStatus,
                  }))
                }
                className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="block text-xs uppercase tracking-wider text-gray-600">
              Quote (EN)
              <textarea
                value={editForm.quoteEn}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, quoteEn: e.target.value }))
                }
                className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm min-h-20"
              />
            </label>

            <label className="block text-xs uppercase tracking-wider text-gray-600">
              Quote (AR)
              <textarea
                value={editForm.quoteAr}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, quoteAr: e.target.value }))
                }
                className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm min-h-20"
                dir="rtl"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs uppercase tracking-wider text-gray-600">
                Title (EN)
                <input
                  value={editForm.titleEn}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, titleEn: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-gray-600">
                Title (AR)
                <input
                  value={editForm.titleAr}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, titleAr: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-200 px-3 py-2 text-sm"
                  dir="rtl"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 border border-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === editTarget.id}
                onClick={() => void saveEdit()}
                className="px-4 py-2 bg-black text-white text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete review"
        message="Delete this review permanently? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger
        isLoading={busyId === deleteTarget?.id}
      />
    </div>
  );
}
