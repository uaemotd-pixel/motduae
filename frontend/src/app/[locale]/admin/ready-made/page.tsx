"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
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
  DollarSign,
  Box,
  Tag,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { resolveMediaUrl } from "@/lib/media";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

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

type Stats = {
  total: number;
  available: number;
  sold: number;
};

type ApiResponse = {
  success: boolean;
  items: ReadyMadeItem[];
  stats: Stats;
  page: number;
  totalPages: number;
  total: number;
};

export default function AdminReadyMadePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReadyMadeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "available" | "sold">(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<ReadyMadeItem | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const [limit, setLimit] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReadyMadeItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

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
    async (
      page = 1,
      showLoading = true,
      requestLimit = limit,
      requestSearch = searchTerm,
      requestStatus = activeTab,
    ) => {
      try {
        if (showLoading && isInitialLoad.current) {
          setLoading(true);
        }
        const status = requestStatus === "all" ? "" : requestStatus;

        const res = await api.get<ApiResponse>(
          `/api/admin/ready-made?page=${page}&limit=${requestLimit}&status=${status}&search=${encodeURIComponent(requestSearch)}`,
        );

        setItems(res.items);
        setStats(res.stats);
        setTotalPages(res.totalPages);
        setCurrentPage(res.page);
        setError(null);
        isInitialLoad.current = false;

        if (res.page > res.totalPages && res.totalPages > 0) {
          await fetchItems(
            res.totalPages,
            false,
            requestLimit,
            requestSearch,
            requestStatus,
          );
          return;
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load ready-made items"));
      } finally {
        setLoading(false);
      }
    },
    [activeTab, searchTerm, limit],
  );

  // Initial load - only once
  useEffect(() => {
    void fetchItems(1, true);
  }, [fetchItems]);

  // Debounced search - show loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialLoad.current) {
        setCurrentPage(1);
        void fetchItems(1, true, limit, searchTerm, activeTab);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, limit, activeTab, fetchItems]);

  // Tab change - no loading flash
  useEffect(() => {
    if (!isInitialLoad.current) {
      setCurrentPage(1);
      void fetchItems(1, false, limit, searchTerm, activeTab);
    }
  }, [activeTab, limit, searchTerm, fetchItems]);

  const handleTabChange = (tab: "all" | "available" | "sold") => {
    setActiveTab(tab);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void fetchItems(page, false, limit, searchTerm, activeTab);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    void fetchItems(1, true, newLimit, searchTerm, activeTab);
  };

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: ReadyMadeItem,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuItem(item);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const normalized = status?.toLowerCase().trim();
    const isAvailable = normalized === "available";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
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
      return (
        <img
          src={item.images[0]}
          alt={item.name}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover hover:cursor-pointer"
          onClick={() =>
            handleImageClick(item.images?.[0] || "IMAGE NOT FOUND")
          }
        />
      );
    }
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      </div>
    );
  };

  const openDeleteModal = (item: ReadyMadeItem) => {
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
      await api.delete(`/api/admin/ready-made/${id}`);
      toast.success(`"${itemName}" has been deleted`);
      await fetchItems(currentPage, false, limit, searchTerm, activeTab);
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
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-8 sm:h-10 w-24 sm:w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={6} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-lg sm:text-xl text-black">
            Unable to load ready-made items
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => fetchItems(1, true)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
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
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <Link
                href={`/admin/ready-made/${menuItem._id}/edit`}
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
                href={`/admin/ready-made/${menuItem._id}`}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Ready-made Inventory
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage ready‑made pieces and their availability
          </p>
        </div>
        <Link
          href="/admin/ready-made/new"
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition text-xs sm:text-sm shadow-sm shrink-0 min-h-9 sm:min-h-10"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="leading-none">Create new</span>
        </Link>
      </div>

      {/* Quick stats - 2 per row on mobile */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
              Total items
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.total}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
              Available
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.available}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 col-span-2 md:col-span-1">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
              Sold
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.sold}
            </p>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTabChange("available")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              activeTab === "available"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => handleTabChange("sold")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              activeTab === "sold"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Sold
          </button>
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, fabric, or tailor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchItems(currentPage, true)}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white shrink-0 hover:cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Table - Desktop */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm
              ? "No items match your search."
              : "No ready-made items yet."}
          </p>
          {!searchTerm && activeTab === "all" && (
            <Link
              href="/admin/ready-made/new"
              className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600 text-sm"
            >
              Create your first item
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
                      Product Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fabric Type
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tailor
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => {
                    const status =
                      item.availableFabricStock > 0 ? "available" : "sold";
                    return (
                      <tr
                        key={item._id}
                        className="group hover:bg-gray-50 transition-all duration-200"
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getItemImage(item)}
                            <span className="text-xs sm:text-sm font-medium text-black">
                              {item.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {item.fabricType || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {item.tailorName || "—"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-mono">
                          <span className="text-gray-500">
                            AED {item.finalSellingPriceAED}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {item.availableFabricStock}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => handleMenuOpen(e, item)}
                            className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                            title="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {items.map((item) => {
              const status =
                item.availableFabricStock > 0 ? "available" : "sold";
              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {getItemImage(item)}
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                          {item.name || "—"}
                        </h3>
                        <StatusBadge status={status} />
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
                      <span className="truncate">{item.fabricType || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                      <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span>{item.tailorName || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                      <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span>AED {item.finalSellingPriceAED}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <Box className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span>Stock: {item.availableFabricStock}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <GlobalPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        showItemsPerPage={true}
        itemsPerPage={limit}
        onItemsPerPageChange={handleLimitChange}
        itemsPerPageOptions={[5, 10, 20, 50, 100]}
        totalItems={stats?.total}
      />

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Ready Made Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
