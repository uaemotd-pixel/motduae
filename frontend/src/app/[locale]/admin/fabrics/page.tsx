"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  Fragment,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link, useRouter } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Eye,
  Image as ImageIcon,
  MoreVertical,
  Tag,
  Store,
  MapPin,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

interface FabricCutRow {
  cutId: string;
  price: number;
  stock: number;
  cut?: {
    _id: string;
    name: string;
    nameAr?: string;
    value: number;
    unit: string;
    lengthInMeters?: number;
  } | null;
}

interface FabricItem {
  _id: string;
  name: string;
  material: string;
  cuts?: FabricCutRow[];
  pricePerMeter?: number;
  images: string[];
  listedByStore: string | { _id: string; name: string };
  city: string;
  storePickupAddress: {
    emirate: string;
    city: string;
    street?: string;
    building?: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: FabricItem[];
}

interface ApiResponse {
  items: FabricItem[];
  total: number;
  page: number;
  totalPages: number;
}

type FabricStatusFilter = "all" | "available" | "sold" | "low";

/** Must match backend LOW_FABRIC_CUT_STOCK_THRESHOLD. */
const LOW_FABRIC_CUT_STOCK = 5;

function isLowCutStock(stock: number) {
  return stock <= LOW_FABRIC_CUT_STOCK;
}

function cutsHaveLowStock(cuts?: FabricCutRow[]) {
  return (cuts || []).some((entry) => isLowCutStock(Number(entry.stock) || 0));
}

function fabricHasLowStock(item: FabricItem) {
  if (cutsHaveLowStock(item.cuts)) return true;
  return (item.variants || []).some((variant) => cutsHaveLowStock(variant.cuts));
}

function getAdminCutLabel(
  entry: FabricCutRow,
  locale: string,
): string {
  const cut = entry.cut;
  if (cut) {
    const name =
      locale === "ar" ? cut.nameAr || cut.name : cut.name;
    if (name?.trim()) return name.trim();
    return `${cut.value} ${cut.unit}`;
  }
  return entry.cutId;
}

function FabricCutsCell({
  cuts,
  locale,
  stockLabel,
  lowLabel,
  outLabel,
}: {
  cuts?: FabricCutRow[];
  locale: string;
  stockLabel: string;
  lowLabel: string;
  outLabel: string;
}) {
  if (!cuts?.length) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className="space-y-1.5 min-w-[12rem] max-w-xs">
      {cuts.map((entry) => {
        const stock = Number(entry.stock) || 0;
        const low = isLowCutStock(stock);
        const out = stock <= 0;
        return (
          <div
            key={entry.cutId}
            className={`rounded-lg border px-2 py-1.5 ${
              low
                ? "border-rose-200 bg-rose-50"
                : "border-gray-100 bg-gray-50/80"
            }`}
          >
            <p className="text-xs font-medium text-black leading-snug">
              {getAdminCutLabel(entry, locale)}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-gray-500">
                AED {Number(entry.price).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <span
                  className={`tabular-nums text-xs font-semibold ${
                    low ? "text-rose-800" : "text-black"
                  }`}
                >
                  {stock} {stockLabel}
                </span>
                {out ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {outLabel}
                  </span>
                ) : low ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                    {lowLabel}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockNameBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export default function AdminFabricsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const localeParam = params.locale as string;
  const t = getTranslation(localeParam);

  const [items, setItems] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<FabricItem | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FabricItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  // Filter tabs (All / Available / Sold / Low stock)
  const [statusFilter, setStatusFilter] = useState<FabricStatusFilter>(
    searchParams.get("stock") === "low" ? "low" : "all",
  );

  // pop up image function
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPosition(null);
        setMenuItem(null);
        setMenuAnchor(null);
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
        setMenuPosition(null);
        setMenuItem(null);
        setMenuAnchor(null);
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

  const fetchItems = useCallback(
    async (page = 1, limitOverride?: number, statusOverride?: string) => {
      try {
        setLoading(true);
        const l = limitOverride || limit;
        const status = statusOverride || statusFilter;
        const res = await api.get<ApiResponse>(
          `/api/admin/fabrics?page=${page}&limit=${l}&search=${encodeURIComponent(searchTerm)}&status=${status}`,
        );

        setItems(res.items || []);
        setTotalItems(res.total || 0);
        setCurrentPage(res.page || 1);
        setTotalPages(res.totalPages || 0);
        setError(null);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t.adminFabrics.list.load_error_title));
        setItems([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, limit, t.adminFabrics.list.load_error_title, statusFilter],
  );

  const applyStatusFilter = (status: FabricStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchItems(1, limit, status);
    if (status === "low") {
      router.replace("/admin/fabrics?stock=low");
    } else if (searchParams.get("stock") === "low") {
      router.replace("/admin/fabrics");
    }
  };

  // Dashboard "Low Stock" lands here with ?stock=low
  useEffect(() => {
    if (searchParams.get("stock") !== "low") return;
    if (statusFilter === "low") return;
    setStatusFilter("low");
    fetchItems(1, limit, "low");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (statusFilter !== "low") return;
    const next: Record<string, boolean> = {};
    for (const item of items) {
      const variantLow = (item.variants || []).some((variant) =>
        cutsHaveLowStock(variant.cuts),
      );
      if (variantLow) next[item._id] = true;
    }
    if (Object.keys(next).length === 0) return;
    setExpandedRows((prev) => ({ ...prev, ...next }));
  }, [items, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const openDeleteModal = (item: FabricItem) => {
    setMenuPosition(null);
    setMenuItem(null);
    setMenuAnchor(null);
    setItemToDelete(item);
    setModalOpen(true);
  };

  const closeDeleteModal = () => {
    setModalOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete._id;
    const itemName = itemToDelete.name || "Item";
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/fabrics/${id}`);
      toast.success(`"${itemName}" deleted successfully`);
      await fetchItems(currentPage);
      closeDeleteModal();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete the item."));
      closeDeleteModal();
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    fetchItems(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    fetchItems(1, newLimit);
  };

  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.filter((i) => !i.isActive).length;
  const cutsCellProps = {
    locale: localeParam,
    stockLabel: t.adminFabrics.list.stock_label,
    lowLabel: t.adminFabrics.list.low_badge,
    outLabel: t.adminFabrics.list.out_badge,
  };

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: FabricItem,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuItem(item);
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
        isActive
          ? "bg-white text-black border border-black/30"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {isActive
        ? t.adminFabrics.list.status_active
        : t.adminFabrics.list.status_inactive}
    </span>
  );

  const getStoreDisplay = (store: FabricItem["listedByStore"]) => {
    if (!store) return "—";
    if (typeof store === "object") return store.name;
    return store.length > 12
      ? `${store.slice(0, 6)}...${store.slice(-6)}`
      : store;
  };

  const getItemImage = (item: FabricItem) => {
    if (item.images && item.images.length > 0) {
      return (
        <div
          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden group cursor-pointer shrink-0"
          onClick={() => handleImageClick(item.images?.[0])}
        >
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      </div>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-8 sm:h-10 w-24 sm:w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={7} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-lg sm:text-xl text-black">
            {t.adminFabrics.list.load_error_title}
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => fetchItems(1)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            {t.adminFabrics.list.try_again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        title="Delete Fabric"
        message={`Are you sure you want to delete "${itemToDelete?.name || "this item"}"? This action cannot be undone.`}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isLoading={!!deletingId}
        isDanger={true}
      />

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
              <Link
                href={`/admin/fabrics/${menuItem._id}/edit`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                  setMenuAnchor(null);
                }}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Edit</span>
              </Link>
              <Link
                href={`/admin/fabrics/${menuItem._id}`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                  setMenuAnchor(null);
                }}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-200 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Details</span>
              </Link>
              <div className="border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  openDeleteModal(menuItem);
                }}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Delete</span>
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.adminFabrics.list.title}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {t.adminFabrics.list.subtitle}
          </p>
        </div>
        <Link
          href="/admin/fabrics/new"
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition text-xs sm:text-sm shadow-sm shrink-0 min-h-9 sm:min-h-10"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="leading-none">{t.adminFabrics.list.new_button}</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            {t.adminFabrics.list.total}
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {totalItems}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            {t.adminFabrics.list.active}
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 col-span-2 md:col-span-1">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            {t.adminFabrics.list.inactive}
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => applyStatusFilter("all")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            All
          </button>
          <button
            onClick={() => applyStatusFilter("available")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              statusFilter === "available"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => applyStatusFilter("sold")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              statusFilter === "sold"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Sold
          </button>
          <button
            onClick={() => applyStatusFilter("low")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              statusFilter === "low"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {t.adminFabrics.list.tab_low_stock}
          </button>
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.adminFabrics.list.search_placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchItems(currentPage)}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white shrink-0 hover:cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{t.adminFabrics.list.refresh}</span>
          </button>
        </div>
      </div>

      {statusFilter === "low" && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-rose-700/80">
              {t.adminFabrics.list.tab_low_stock}
            </p>
            <p className="text-sm text-rose-900 mt-0.5">
              {t.adminFabrics.list.low_stock_hint}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm
              ? t.adminFabrics.list.empty_search
              : statusFilter === "low"
                ? t.adminFabrics.list.empty_low_stock
                : t.adminFabrics.list.empty}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Link
              href="/admin/fabrics/new"
              className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600 text-sm"
            >
              {t.adminFabrics.list.create_first}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_name}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_material}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_price}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_store}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_city}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_status}
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => {
                    const itemLow = fabricHasLowStock(item);
                    return (
                    <Fragment key={item._id}>
                      <tr
                        data-low-stock={itemLow ? "true" : undefined}
                        className={`group transition-all duration-200 ${
                          itemLow
                            ? "bg-rose-50/80 hover:bg-rose-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getItemImage(item)}
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-black">
                                {item.name || "—"}
                              </span>
                              {itemLow && (
                                <div className="mt-1">
                                  <LowStockNameBadge
                                    label={t.adminFabrics.list.low_badge}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.material}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                          <FabricCutsCell
                            cuts={item.cuts}
                            {...cutsCellProps}
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getStoreDisplay(item.listedByStore)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.storePickupAddress?.emirate || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <StatusBadge isActive={item.isActive} />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right space-x-2">
                          {item.variants && item.variants.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [item._id]: !prev[item._id],
                                }));
                              }}
                              className="px-2.5 py-1 border border-black/25 text-[10px] font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition rounded cursor-pointer"
                            >
                              {expandedRows[item._id]
                                ? "Hide variants"
                                : `Show variant (${item.variants.length})`}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleMenuOpen(e, item)}
                            className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      {expandedRows[item._id] &&
                        item.variants &&
                        item.variants.length > 0 && (
                          <tr className="bg-[#FAF9F5]/40">
                            <td colSpan={7} className="px-4 sm:px-6 py-4">
                              <div className="pl-4 sm:pl-8 space-y-2.5">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55 block">
                                  Variations
                                </span>
                                <div className="border border-gray-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/70">
                                      <tr>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_name}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_material}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_price}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_store}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_city}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_status}
                                        </th>
                                        <th className="px-3 sm:px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                          {t.adminFabrics.list.col_actions}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                      {item.variants.map((v) => {
                                        const variantLow = cutsHaveLowStock(
                                          v.cuts,
                                        );
                                        return (
                                        <tr
                                          key={v._id}
                                          className={
                                            variantLow
                                              ? "bg-rose-50/80 hover:bg-rose-50"
                                              : "hover:bg-gray-50/60 transition-colors"
                                          }
                                        >
                                          <td className="px-3 sm:px-4 py-3 text-xs font-semibold text-black">
                                            <div className="flex items-center gap-2">
                                              {v.images &&
                                              v.images.length > 0 ? (
                                                <div
                                                  className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden group cursor-pointer shrink-0"
                                                  onClick={() =>
                                                    handleImageClick(
                                                      v.images[0],
                                                    )
                                                  }
                                                >
                                                  <img
                                                    src={v.images[0]}
                                                    alt={v.name}
                                                    className="w-full h-full object-cover"
                                                  />
                                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                  <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                                </div>
                                              )}
                                              <div className="min-w-0">
                                                <span className="text-xs sm:text-sm">
                                                  {v.name}
                                                </span>
                                                {variantLow && (
                                                  <div className="mt-1">
                                                    <LowStockNameBadge
                                                      label={
                                                        t.adminFabrics.list
                                                          .low_badge
                                                      }
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            {v.material}
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 text-xs text-gray-600">
                                            <FabricCutsCell
                                              cuts={v.cuts}
                                              {...cutsCellProps}
                                            />
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            {getStoreDisplay(v.listedByStore)}
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            {v.storePickupAddress?.emirate ||
                                              "—"}
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                            <StatusBadge
                                              isActive={v.isActive}
                                            />
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">
                                            <button
                                              onClick={(e) =>
                                                handleMenuOpen(e, v)
                                              }
                                              className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                                              title="Actions"
                                            >
                                              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </button>
                                          </td>
                                        </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {items.map((item) => {
              const itemLow = fabricHasLowStock(item);
              return (
              <div
                key={item._id}
                className={`rounded-2xl shadow-sm border p-3 sm:p-4 ${
                  itemLow
                    ? "bg-rose-50 border-rose-200"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {getItemImage(item)}
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                        {item.name || "—"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge isActive={item.isActive} />
                        {itemLow && (
                          <LowStockNameBadge
                            label={t.adminFabrics.list.low_badge}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleMenuOpen(e, item)}
                    className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer shrink-0"
                    title="Actions"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                    <Tag className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{item.material || "—"}</span>
                  </div>
                  <div className="text-gray-600">
                    <FabricCutsCell
                      cuts={item.cuts}
                      {...cutsCellProps}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Store className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">
                      {getStoreDisplay(item.listedByStore)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>{item.storePickupAddress?.emirate || "—"}</span>
                  </div>
                </div>

                {item.variants && item.variants.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedRows((prev) => ({
                          ...prev,
                          [item._id]: !prev[item._id],
                        }));
                      }}
                      className="text-[10px] font-medium text-gray-500 hover:text-black transition"
                    >
                      {expandedRows[item._id]
                        ? "Hide variants"
                        : `Show variants (${item.variants.length})`}
                    </button>
                    {expandedRows[item._id] && (
                      <div className="mt-2 space-y-2">
                        {item.variants.map((v) => {
                          const variantLow = cutsHaveLowStock(v.cuts);
                          return (
                          <div
                            key={v._id}
                            className={`rounded-lg p-3 ${
                              variantLow
                                ? "bg-white border border-rose-200"
                                : "bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {v.images && v.images.length > 0 ? (
                                  <div
                                    className="relative w-7 h-7 rounded-lg overflow-hidden group cursor-pointer shrink-0"
                                    onClick={() =>
                                      handleImageClick(v.images[0])
                                    }
                                  >
                                    <img
                                      src={v.images[0]}
                                      alt={v.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <Maximize2 className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-3 h-3 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="text-xs font-medium truncate block">
                                    {v.name}
                                  </span>
                                  {variantLow && (
                                    <LowStockNameBadge
                                      label={t.adminFabrics.list.low_badge}
                                    />
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleMenuOpen(e, v)}
                                className="text-gray-400 hover:text-black p-1"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-1.5 grid grid-cols-1 gap-1 text-[10px] text-gray-600">
                              <span>Material: {v.material}</span>
                              <div className="flex items-start gap-1">
                                <span className="shrink-0">Cuts:</span>
                                <FabricCutsCell
                                  cuts={v.cuts}
                                  {...cutsCellProps}
                                />
                              </div>
                              <span>
                                Store: {getStoreDisplay(v.listedByStore)}
                              </span>
                              <span>
                                City: {v.storePickupAddress?.emirate || "—"}
                              </span>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
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

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Fabric Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
