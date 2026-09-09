"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Check,
  Ruler,
  Lock,
  RefreshCw,
  Power,
  MoreVertical,
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

function getNextCutNamePreview(totalCount: number): string {
  if (totalCount <= 0) return "cut";
  return `cut ${totalCount}`;
}

function getEquivalentLabel(cut: Cut): string {
  const meters = cut.metersEquivalent ?? cutValueToMeters(cut.value, cut.unit);
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
  const [editingCut, setEditingCut] = useState<Cut | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editUnit, setEditUnit] = useState<CutUnit>("meter");
  const [editIsActive, setEditIsActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cutToDelete, setCutToDelete] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [menuItem, setMenuItem] = useState<Cut | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [createValue, setCreateValue] = useState("");
  const [createUnit, setCreateUnit] = useState<CutUnit>("meter");
  const [createIsActive, setCreateIsActive] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  const closeMenu = () => {
    setMenuPosition(null);
    setMenuItem(null);
    setMenuAnchor(null);
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }
    if (menuPosition) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuPosition]);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }
    if (menuPosition) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuPosition]);

  // Reposition menu on scroll/resize
  useEffect(() => {
    function updateMenuPosition() {
      if (menuAnchor && menuPosition) {
        const rect = menuAnchor.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    }

    if (menuPosition) {
      window.addEventListener("scroll", updateMenuPosition, true);
      window.addEventListener("resize", updateMenuPosition);
      return () => {
        window.removeEventListener("scroll", updateMenuPosition, true);
        window.removeEventListener("resize", updateMenuPosition);
      };
    }
  }, [menuPosition, menuAnchor]);

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

  const openEditModal = (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be edited.");
      return;
    }
    closeMenu();
    setEditingCut(item);
    setEditValue(String(item.value));
    setEditUnit(item.unit);
    setEditIsActive(item.isActive);
  };

  const closeEditModal = () => {
    setEditingCut(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const numericValue = Number(createValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error("Cut length must be greater than 0");
      return;
    }

    setCreating(true);
    try {
      await api.post("/api/admin/cuts", {
        value: numericValue,
        unit: createUnit,
        isActive: createIsActive,
      });
      toast.success("Cut created");
      setCreateValue("");
      setCreateUnit("meter");
      setCreateIsActive(true);
      void fetchCuts(1);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create cut"));
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCut) return;

    const numericValue = Number(editValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      toast.error("Cut length must be greater than 0");
      return;
    }

    setSubmittingEdit(true);
    try {
      await api.put(`/api/admin/cuts/${editingCut._id}`, {
        value: numericValue,
        unit: editUnit,
        isActive: editIsActive,
      });
      toast.success("Cut updated");
      closeEditModal();
      void fetchCuts(currentPage);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save cut"));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const promptDelete = (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be deleted.");
      return;
    }
    closeMenu();
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

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: Cut,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuItem(item);
  };

  const toggleActive = async (item: Cut) => {
    if (item.isInUse) {
      toast.error("This cut is in use and cannot be changed.");
      return;
    }

    closeMenu();
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

  const createPreviewValue = Number(createValue);
  const createPreviewEquivalent =
    Number.isFinite(createPreviewValue) && createPreviewValue > 0
      ? createUnit === "war"
        ? `≈ ${cutValueToMeters(createPreviewValue, "war").toFixed(2)} meter`
        : `≈ ${metersToWar(createPreviewValue).toFixed(2)} war`
      : null;

  const editPreviewValue = Number(editValue);
  const editPreviewEquivalent =
    Number.isFinite(editPreviewValue) && editPreviewValue > 0
      ? editUnit === "war"
        ? `≈ ${cutValueToMeters(editPreviewValue, "war").toFixed(2)} meter`
        : `≈ ${metersToWar(editPreviewValue).toFixed(2)} war`
      : null;

  const nextCutNamePreview = searchQuery.trim()
    ? "auto-assigned on save"
    : getNextCutNamePreview(totalItems);

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
      {/* Floating Menu Portal */}
      {menuPosition &&
        menuItem &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              style={{
                position: "fixed",
                top: menuPosition.top,
                right: menuPosition.right,
                zIndex: 50,
              }}
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleActive(menuItem)}
                disabled={!!menuItem.isInUse || togglingId === menuItem._id}
                className={`w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors text-left hover:cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                  menuItem.isActive
                    ? "text-red-600 hover:bg-red-50"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {togglingId === menuItem._id ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                <span>{menuItem.isActive ? "Deactivate" : "Activate"}</span>
              </button>
              <button
                type="button"
                onClick={() => openEditModal(menuItem)}
                disabled={!!menuItem.isInUse}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Edit</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => promptDelete(menuItem)}
                disabled={!!menuItem.isInUse || deletingId === menuItem._id}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors text-left hover:cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === menuItem._id ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                )}
                <span>Delete</span>
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-linear-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-lg">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 pt-1">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
                Cuts
              </h1>
              <p className="text-gray-500 text-sm">
                Manage predefined fabric cut lengths (war and meter). Names are
                auto-assigned: cut, cut 1, cut 2, …
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-800">Unit conversion:</span> 1
        meter = 1.0936 war · 1 war = 0.9144 meter. The first cut is named{" "}
        <span className="font-mono text-gray-800">cut</span>; additional cuts
        are <span className="font-mono text-gray-800">cut 1</span>,{" "}
        <span className="font-mono text-gray-800">cut 2</span>, and so on.
      </div>

      {/* Inline create form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Add new cut
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Will be saved as:{" "}
          <span className="font-mono font-medium text-gray-800">
            {nextCutNamePreview}
          </span>
        </p>

        <form
          onSubmit={handleCreate}
          className="flex flex-col lg:flex-row lg:items-end gap-4"
        >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                Length <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
                Unit <span className="text-red-400">*</span>
              </label>
              <select
                value={createUnit}
                onChange={(e) => setCreateUnit(e.target.value as CutUnit)}
                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
              >
                <option value="meter">Meter</option>
                <option value="war">War</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:shrink-0">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createIsActive}
                onChange={(e) => setCreateIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <motion.button
              type="submit"
              disabled={creating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all disabled:opacity-50 hover:cursor-pointer inline-flex items-center justify-center gap-2 min-h-10.5"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {creating ? "Adding..." : "Add Cut"}
            </motion.button>
          </div>
        </form>

        {createPreviewEquivalent && (
          <p className="text-sm text-gray-500 mt-3">
            Equivalent: {createPreviewEquivalent}
          </p>
        )}
      </div>

      {/* Filters & Search — right-aligned like other admin list pages */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end">
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cuts by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchCuts(currentPage)}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Refresh</span>
          </button>
        </div>
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
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="w-20 h-20 bg-linear-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <Ruler className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchQuery ? "No matching cuts" : "No cuts yet"}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {searchQuery
              ? "Try a different search term or clear the filter."
              : "Use the form above to add your first cut."}
          </p>
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
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors font-mono">
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
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-gray-50 text-gray-400 ring-1 ring-gray-300/20"
                        }`}
                      >
                        {item.isActive ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {item.createdAt && (
                        <span className="text-xs text-gray-400">
                          Created {formatDate(item.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleMenuOpen(e, item)}
                      className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                      title="Actions"
                      aria-label="Open actions menu"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
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
        {editingCut && (
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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Edit Cut
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span className="font-mono font-medium text-gray-800">
                        {editingCut.name}
                      </span>
                      {editingCut.nameAr && (
                        <span dir="rtl" className="ml-2">
                          ({editingCut.nameAr})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition hover:cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-5">
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
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="e.g. 3.5"
                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Unit <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value as CutUnit)}
                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                      >
                        <option value="meter">Meter</option>
                        <option value="war">War</option>
                      </select>
                    </div>
                  </div>

                  {editPreviewEquivalent && (
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                      Equivalent: {editPreviewEquivalent}
                    </p>
                  )}

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="cutIsActive"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
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
                      onClick={closeEditModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition hover:cursor-pointer"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={submittingEdit}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-5 py-2.5 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium shadow-lg shadow-gray-900/20 hover:shadow-xl transition-all disabled:opacity-50 hover:cursor-pointer inline-flex items-center gap-2"
                    >
                      {submittingEdit && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {submittingEdit ? "Saving..." : "Update Cut"}
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
