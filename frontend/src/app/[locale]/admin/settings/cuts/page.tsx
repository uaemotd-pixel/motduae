"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Check,
  Ruler,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  cutValueToMeters,
  formatCutLabel,
  metersToWar,
  type CutUnit,
} from "@/lib/fabricUnits";

interface Cut {
  _id: string;
  name: string;
  nameAr?: string;
  value: number;
  unit: CutUnit;
  isActive: boolean;
  metersEquivalent?: number;
  warEquivalent?: number;
  usageCount?: number;
  isInUse?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  items: Cut[];
  total: number;
  page: number;
  totalPages: number;
}

const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

const toLowerPreserveSpaces = (str: string): string => {
  return str.toLowerCase().trim();
};

function getEquivalentLabel(cut: Cut): string {
  const meters =
    cut.metersEquivalent ?? cutValueToMeters(cut.value, cut.unit);
  const war = cut.warEquivalent ?? metersToWar(meters);

  if (cut.unit === "war") {
    return `≈ ${meters.toFixed(2)} meter`;
  }
  return `≈ ${war.toFixed(2)} war`;
}

export default function AdminSettingsCutsPage() {
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCut, setEditingCut] = useState<Cut | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cutToDelete, setCutToDelete] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [formName, setFormName] = useState("");
  const [formNameAr, setFormNameAr] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formUnit, setFormUnit] = useState<CutUnit>("meter");
  const [formIsActive, setFormIsActive] = useState(true);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const fetchCuts = useCallback(
    async (page = 1, limitOverride?: number, searchOverride?: string) => {
      try {
        setLoading(true);
        const l = limitOverride ?? limit;
        const search = searchOverride ?? searchQuery;
        const searchParam = search.trim()
          ? `&search=${encodeURIComponent(search.trim())}`
          : "";

        const data = await api.get<ApiResponse>(
          `/api/admin/cuts?page=${page}&limit=${l}${searchParam}`,
        );

        setCuts(data.items || []);
        setTotalItems(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 0);

        if (data.page > data.totalPages && data.totalPages > 0) {
          await fetchCuts(data.totalPages, l, search);
        }
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, "Failed to load cuts"));
        setCuts([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, searchQuery],
  );

  useEffect(() => {
    void fetchCuts(1).finally(() => {
      isInitialLoad.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      void fetchCuts(1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void fetchCuts(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    void fetchCuts(1, newLimit);
  };

  const openAddModal = () => {
    setEditingCut(null);
    setFormName("");
    setFormNameAr("");
    setFormValue("");
    setFormUnit("meter");
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be edited.");
      return;
    }
    setEditingCut(item);
    setFormName(item.name);
    setFormNameAr(item.nameAr || "");
    setFormValue(String(item.value));
    setFormUnit(item.unit);
    setFormIsActive(item.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericValue = Number(formValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error("Cut length must be greater than 0");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: toSlug(formName),
      nameAr: toLowerPreserveSpaces(formNameAr),
      value: numericValue,
      unit: formUnit,
      isActive: formIsActive,
    };

    try {
      if (editingCut) {
        await api.put(`/api/admin/cuts/${editingCut._id}`, payload);
        toast.success("Cut updated");
      } else {
        await api.post("/api/admin/cuts", payload);
        toast.success("Cut created");
      }
      setShowModal(false);
      void fetchCuts(editingCut ? currentPage : 1);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save cut"));
    } finally {
      setSubmitting(false);
    }
  };

  const promptDelete = (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be deleted.");
      return;
    }
    setCutToDelete(item._id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!cutToDelete) return;
    setDeletingId(cutToDelete);
    setShowDeleteConfirm(false);
    try {
      await api.delete(`/api/admin/cuts/${cutToDelete}`);
      toast.success("Cut deleted");
      void fetchCuts(currentPage);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete cut"));
    } finally {
      setDeletingId(null);
      setCutToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setCutToDelete(null);
  };

  const toggleActive = async (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be changed.");
      return;
    }

    const newIsActive = !item.isActive;
    setCuts((prev) =>
      prev.map((x) =>
        x._id === item._id ? { ...x, isActive: newIsActive } : x,
      ),
    );
    setTogglingId(item._id);
    try {
      await api.put(`/api/admin/cuts/${item._id}`, { isActive: newIsActive });
      toast.success(`Cut ${newIsActive ? "activated" : "deactivated"}`);
    } catch (err: unknown) {
      setCuts((prev) =>
        prev.map((x) =>
          x._id === item._id ? { ...x, isActive: !newIsActive } : x,
        ),
      );
      toast.error(getApiErrorMessage(err, "Failed to update cut"));
    } finally {
      setTogglingId(null);
    }
  };

  const previewValue = Number(formValue);
  const previewEquivalent =
    Number.isFinite(previewValue) && previewValue > 0
      ? formUnit === "war"
        ? `≈ ${cutValueToMeters(previewValue, "war").toFixed(2)} meter`
        : `≈ ${metersToWar(previewValue).toFixed(2)} war`
      : null;

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(new Date(d));
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
                Cuts
              </h1>
              <p className="text-gray-500 text-sm">
                Manage predefined fabric cut lengths for custom orders (war and
                meter)
              </p>
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={openAddModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all hover:cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Cut
        </motion.button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-800">Unit conversion:</span> 1
        meter = 1.0936 war · 1 war = 0.9144 meter. Values are stored in the
        unit you choose when creating a cut.
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cuts by name..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition hover:cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!loading && totalItems > 0 && (
        <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">
          {searchQuery.trim()
            ? `${totalItems} matching cut${totalItems === 1 ? "" : "s"}`
            : `${totalItems} cut${totalItems === 1 ? "" : "s"} total`}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={3} className="rounded-2xl" />
      ) : cuts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-20 h-20 bg-linear-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <Ruler className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? "No matching cuts" : "No cuts yet"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            {searchQuery
              ? "Try a different search term or clear the filter."
              : "Create your first cut preset for the custom order flow."}
          </p>
          {!searchQuery && (
            <motion.button
              type="button"
              onClick={openAddModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all hover:cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Cut
            </motion.button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {cuts.map((item, index) => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                        {item.name}
                      </h3>
                      {item.nameAr && (
                        <span
                          dir="rtl"
                          className="text-sm text-gray-400 font-normal"
                        >
                          {item.nameAr}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                        {formatCutLabel(item.value, item.unit)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {getEquivalentLabel(item)}
                      </span>
                      {item.isInUse && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                          title={`Used in ${item.usageCount ?? 0} order(s)`}
                        >
                          <Lock className="w-3 h-3" />
                          In use
                        </span>
                      )}
                      <motion.button
                        type="button"
                        onClick={() => toggleActive(item)}
                        disabled={togglingId === item._id || item.isInUse}
                        whileHover={{ scale: item.isInUse ? 1 : 1.05 }}
                        whileTap={{ scale: item.isInUse ? 1 : 0.95 }}
                        title={
                          item.isInUse
                            ? "Cannot change status while cut is in use"
                            : `Click to ${item.isActive ? "deactivate" : "activate"}`
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                          item.isInUse
                            ? "bg-gray-50 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed"
                            : item.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 hover:bg-red-50 hover:text-red-600 hover:ring-red-300 cursor-pointer"
                              : "bg-gray-50 text-gray-400 ring-1 ring-gray-300/20 hover:bg-gray-100 hover:text-gray-500 cursor-pointer"
                        }`}
                      >
                        {togglingId === item._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : item.isActive ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {item.isActive ? "Active" : "Inactive"}
                      </motion.button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {item.createdAt && (
                        <span className="text-xs text-gray-400">
                          Created {formatDate(item.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 shrink-0 transition-opacity ${
                      item.isInUse
                        ? "opacity-40"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <motion.button
                      type="button"
                      onClick={() => openEditModal(item)}
                      disabled={item.isInUse}
                      whileHover={{ scale: item.isInUse ? 1 : 1.05 }}
                      whileTap={{ scale: item.isInUse ? 1 : 0.95 }}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-700 transition-all hover:cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Edit cut"
                    >
                      <Pencil className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      disabled={deletingId === item._id || item.isInUse}
                      onClick={() => promptDelete(item)}
                      whileHover={{ scale: item.isInUse ? 1 : 1.05 }}
                      whileTap={{ scale: item.isInUse ? 1 : 0.95 }}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all hover:cursor-pointer disabled:opacity-50"
                      aria-label="Delete cut"
                    >
                      {deletingId === item._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {totalPages > 0 && totalItems > 0 && (
        <GlobalPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          showItemsPerPage={true}
          itemsPerPage={limit}
          onItemsPerPageChange={handleLimitChange}
          itemsPerPageOptions={[5, 10, 20, 50, 100]}
          totalItems={totalItems}
        />
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingCut ? "Edit Cut" : "New Cut"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {editingCut
                        ? "Update the cut details below."
                        : "Define a preset fabric length for custom orders."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition hover:cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. standard-thob"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Will be saved as: {formName ? toSlug(formName) : "..."}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name (Arabic)
                      </label>
                      <input
                        type="text"
                        value={formNameAr}
                        onChange={(e) => setFormNameAr(e.target.value)}
                        dir="rtl"
                        placeholder="مثال: ثوب عادي"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Length <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        placeholder="e.g. 3.5"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Unit <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formUnit}
                        onChange={(e) =>
                          setFormUnit(e.target.value as CutUnit)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-shadow bg-white"
                      >
                        <option value="meter">Meter</option>
                        <option value="war">War</option>
                      </select>
                    </div>
                  </div>

                  {previewEquivalent && (
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                      Equivalent: {previewEquivalent}
                    </p>
                  )}

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="cutIsActive"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label
                      htmlFor="cutIsActive"
                      className="text-sm text-gray-700 cursor-pointer select-none"
                    >
                      <span className="font-medium">Active</span>
                      <span className="text-gray-400 ml-1">
                        — available in custom order presets
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition hover:cursor-pointer"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all disabled:opacity-50 hover:cursor-pointer inline-flex items-center gap-2"
                    >
                      {submitting && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {submitting
                        ? "Saving..."
                        : editingCut
                          ? "Update Cut"
                          : "Create Cut"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Cut"
        message="Are you sure you want to delete this cut? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={deletingId !== null}
        isDanger
      />
    </div>
  );
}
