"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { isLowStockQty } from "@/lib/lowStock";
import { LowStockBadge } from "@/components/shared/LowStockBadge";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  Image as ImageIcon,
  MoreVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import {
  PartnerListingPrice,
  useFabricStoreCommission,
} from "@/components/partner/CommissionFinalPriceField";
import { fetchOwnFabricShop, type FabricShopProfile } from "@/lib/fabricShop";
import { isShopProfileComplete } from "@/lib/shopProfile";
import { replaceClientSearchParam } from "@/lib/replaceClientSearchParam";

interface ReadyMadeItem {
  _id: string;
  name: string;
  fabricType: string;
  tailorName: string;
  finalSellingPriceAED: number;
  availableFabricStock: number;
  status: "available" | "sold";
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

interface ReadyMadeListResponse {
  items: ReadyMadeItem[];
  total: number;
  page: number;
  totalPages: number;
  stats?: {
    available: number;
    sold: number;
  };
}

export default function FabricReadyMadePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const commissionPercent = useFabricStoreCommission();
  const [items, setItems] = useState<ReadyMadeItem[]>([]);
  const [shop, setShop] = useState<FabricShopProfile | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shopMissing, setShopMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">(
    searchParams.get("stock") === "low" ? "low" : "all",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);
  const [stats, setStats] = useState({ available: 0, sold: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<ReadyMadeItem | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReadyMadeItem | null>(null);
  const [modalImage, setModalImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPosition(null);
        setMenuItem(null);
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
      }
    }
    if (menuPosition) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuPosition]);

  const fetchItems = useCallback(
    async (page = 1, limitOverride?: number, showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setShopMissing(false);
        const l = limitOverride || limit;
        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(l));
        if (searchTerm.trim()) query.set("search", searchTerm.trim());
        if (stockFilter === "low") query.set("stock", "low");

        const [data, shopData] = await Promise.all([
          api.get<ReadyMadeListResponse>(
            `/api/fabric/ready-made?${query.toString()}`,
          ),
          fetchOwnFabricShop().catch(() => null),
        ]);
        setItems(data.items || []);
        setTotalItems(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 0);
        setStats({
          available: data.stats?.available || 0,
          sold: data.stats?.sold || 0,
        });
        setShop(shopData);
        setError(null);
      } catch (err: any) {
        if (err?.status === 404) {
          setShopMissing(true);
        } else {
          console.error("Failed to fetch ready-made items:", err.message || err);
          setError(err.message || "Failed to load ready-made items");
        }
        setItems([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [limit, searchTerm, stockFilter],
  );

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      void fetchItems(1).finally(() => {
        isInitialLoad.current = false;
      });
      return;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(1, undefined, false);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchItems]);

  useEffect(() => {
    if (searchParams.get("stock") === "low") setStockFilter("low");
  }, [searchParams]);

  const applyStockFilter = (next: "all" | "low") => {
    if (next === stockFilter) return;
    setStockFilter(next);
    replaceClientSearchParam("stock", next === "low" ? "low" : null);
  };

  const handleCreateClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!shop || !isShopProfileComplete(shop)) {
      toast.error("Please set up your store profile first before managing ready-to-wear items.");
      setShowIncompleteModal(true);
      return;
    }
    router.push("/fabric/ready-made/new");
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const normalized = status?.toLowerCase().trim();
    const isAvailable = normalized === "available";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isAvailable
            ? "bg-white text-black border border-black/30"
            : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {isAvailable ? "Available" : "Sold"}
      </span>
    );
  };

  const getItemImage = (item: ReadyMadeItem) => {
    if (item.images && item.images.length > 0) {
      const imageUrl = item.images[0];
      return (
        <button
          type="button"
          onClick={() => setModalImage({ url: imageUrl, name: item.name })}
          className="cursor-pointer"
        >
          <img
            src={imageUrl}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover hover:ring-2 hover:ring-black/20 transition-all"
          />
        </button>
      );
    }
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <ImageIcon className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  const openDeleteModal = (item: ReadyMadeItem) => {
    setMenuPosition(null);
    setMenuItem(null);
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
      await api.delete(`/api/fabric/ready-made/${id}`);
      toast.success(`"${itemName}" has been deleted`);
      const nextPage =
        items.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await fetchItems(nextPage);
      closeDeleteModal();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete the item."));
      closeDeleteModal();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={6} className="rounded-2xl" />
      </div>
    );
  }

  if (shopMissing) {
    return (
      <div className="max-w-2xl border border-gray-200 bg-white p-8 rounded-2xl shadow-sm">
        <h1 className="[font-family:var(--font-display)] text-2xl font-light text-black mb-3">
          Store Profile Required
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          You must set up your store profile first before you can manage
          ready-to-wear items.
        </p>
        <Link
          href="/fabric/shop"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
        >
          Create Store Profile
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-xl text-black">
            Unable to load ready-made items
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={() => fetchItems(1)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        title="Delete Item"
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
              className="w-fit px-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 overflow-hidden"
            >
              <Link
                href={`/fabric/ready-made/${menuItem._id}/edit`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <Edit className="w-4 h-4 shrink-0" />
                <span>Edit</span>
              </Link>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  openDeleteModal(menuItem);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left hover:cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Delete</span>
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      {shop && !isShopProfileComplete(shop) && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Store Profile Required
              </p>
              <p className="text-xs text-amber-800">
                You must set up your store profile first before you can manage ready-to-wear items.
              </p>
            </div>
          </div>
          <Link
            href="/fabric/shop"
            className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-xs font-semibold uppercase tracking-wider shrink-0"
          >
            Create Store Profile
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-light text-black tracking-tight">
            Ready-made Inventory
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage ready‑made pieces and their availability
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateClick}
          className="inline-flex w-fit max-w-full items-center justify-center gap-2 self-start px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create new
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Total items
          </p>
          <p className="text-2xl font-light text-black mt-1">{totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Available
          </p>
          <p className="text-2xl font-light text-black mt-1">
            {stats.available}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Sold</p>
          <p className="text-2xl font-light text-black mt-1">{stats.sold}</p>
        </div>
      </div>

      {/* Search & refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => applyStockFilter("all")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              stockFilter === "all"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => applyStockFilter("low")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              stockFilter === "low"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Low stock
          </button>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, fabric, tailor, price, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchItems(currentPage)}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No items match your search."
              : "No ready-made items yet."}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600 cursor-pointer"
            >
              Add your first ready-made item
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {items.map((item) => {
              const status =
                item.availableFabricStock > 0 ? "available" : "sold";
              const itemLow = isLowStockQty(item.availableFabricStock);
              return (
                <div
                  key={item._id}
                  className={`rounded-xl border p-3 ${
                    itemLow
                      ? "border-rose-200 bg-rose-50/80"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    <div className="shrink-0">{getItemImage(item)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-black leading-snug">
                          {item.name || "—"}
                        </p>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {item.fabricType || "—"}
                        {item.tailorName ? ` · ${item.tailorName}` : ""}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        <PartnerListingPrice
                          netAmount={item.finalSellingPriceAED}
                          commissionPercent={commissionPercent}
                          stacked
                          className="font-mono text-xs"
                        />
                        <span className="text-gray-500">
                          {" "}
                          · {item.availableFabricStock} in stock
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/fabric/ready-made/${item._id}/edit`}
                      className="flex-1 text-center px-3 py-2 border border-black text-black text-[10px] tracking-[0.16em] uppercase"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(item)}
                      className="flex-1 px-3 py-2 border border-red-300 text-red-700 text-[10px] tracking-[0.16em] uppercase"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fabric Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tailor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const status =
                    item.availableFabricStock > 0 ? "available" : "sold";
                  const itemLow = isLowStockQty(item.availableFabricStock);
                  return (
                    <tr
                      key={item._id}
                      className={`group transition-all duration-200 ${
                        itemLow
                          ? "bg-rose-50/80 hover:bg-rose-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getItemImage(item)}
                          <div>
                            <span className="text-sm font-medium text-black">
                              {item.name || "—"}
                            </span>
                            {itemLow && (
                              <div className="mt-1">
                                <LowStockBadge label="Low stock" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.fabricType || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.tailorName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <PartnerListingPrice
                          netAmount={item.finalSellingPriceAED}
                          commissionPercent={commissionPercent}
                          stacked
                          className="font-mono text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`tabular-nums font-semibold ${
                              itemLow ? "text-rose-800" : "text-gray-700"
                            }`}
                          >
                            {item.availableFabricStock}
                          </span>
                          {item.availableFabricStock <= 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Out
                            </span>
                          ) : itemLow ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                              Low
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + 8,
                              right: window.innerWidth - rect.right,
                            });
                            setMenuItem(item);
                          }}
                          className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5 hover:cursor-pointer" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {totalItems > 0 && (
        <GlobalPagination
          currentPage={currentPage}
          totalPages={Math.max(1, totalPages)}
          onPageChange={(page) => fetchItems(page)}
          showItemsPerPage={true}
          itemsPerPage={limit}
          onItemsPerPageChange={(newLimit) => {
            setLimit(newLimit);
            fetchItems(1, newLimit);
          }}
          itemsPerPageOptions={[5, 10, 20, 50, 100]}
          totalItems={totalItems}
        />
      )}

      {/* Confirmation Modal for Profile Incomplete */}
      <ConfirmationModal
        isOpen={showIncompleteModal}
        title="Store Profile Required"
        message="You must set up your store profile first before you can manage ready-to-wear items."
        confirmLabel="Create Store Profile"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowIncompleteModal(false);
          router.push("/fabric/shop");
        }}
        onCancel={() => setShowIncompleteModal(false)}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={!!modalImage}
        imageUrl={modalImage?.url ?? ""}
        alt={modalImage?.name ?? "Fabric image"}
        onClose={() => setModalImage(null)}
      />
    </div>
  );
}
