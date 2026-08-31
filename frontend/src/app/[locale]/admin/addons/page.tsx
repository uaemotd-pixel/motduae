"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Sparkles,
  AlertCircle,
  Search,
  RefreshCw,
  MoreVertical,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

interface AddOnItem {
  _id: string;
  name: string;
  nameAr: string;
  price: number;
  stock: number;
  isActive: boolean;
  thumbnailImage: string;
  createdAt: string;
}

interface ApiResponse {
  items: AddOnItem[];
  total: number;
  page: number;
  totalPages: number;
}

const formatAED = (value: number) =>
  `AED ${(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AdminAddOnsPage() {
  const [items, setItems] = useState<AddOnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<AddOnItem | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AddOnItem | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    async (page = 1, limitOverride?: number) => {
      try {
        setLoading(true);
        setError(null);
        const l = limitOverride || limit;
        const search = searchTerm
          ? `&search=${encodeURIComponent(searchTerm)}`
          : "";
        const data = await api.get<ApiResponse>(
          `/api/admin/addons?page=${page}&limit=${l}${search}`,
        );
        setItems(data.items || []);
        setTotalItems(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        console.error("Failed to load addons:", err);
        setError(getApiErrorMessage(err, "Failed to load addons"));
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, limit],
  );

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

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
  }, [searchTerm, fetchItems]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const data = await api.patch<{ success: boolean; isActive: boolean }>(
        `/api/admin/addons/${id}/toggle-active`,
      );
      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isActive: data.isActive } : item,
        ),
      );
      toast.success(
        `Add-on ${data.isActive ? "activated" : "deactivated"} successfully`,
      );
      setMenuPosition(null);
      setMenuItem(null);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to toggle status"));
    }
  };

  const openDeleteModal = (item: AddOnItem) => {
    setMenuPosition(null);
    setMenuItem(null);
    setItemToDelete(item);
    setModalOpen(true);
  };

  const closeDeleteModal = () => {
    setItemToDelete(null);
    setModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete._id;
    try {
      setDeletingId(id);
      closeDeleteModal();
      await api.delete(`/api/admin/addons/${id}`);
      toast.success("Add-on deleted successfully");
      await fetchItems(currentPage);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to delete addon"));
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

  const activeCount = useMemo(
    () => items.filter((i) => i.isActive).length,
    [items],
  );
  const inactiveCount = useMemo(
    () => items.filter((i) => !i.isActive).length,
    [items],
  );

  const isLowStock = (stock: number) => stock > 0 && stock <= 5;

  const getItemImage = (item: AddOnItem) => {
    if (item.thumbnailImage) {
      return (
        <img
          src={item.thumbnailImage}
          alt={item.name}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover hover:cursor-pointer shrink-0"
          onClick={() => handleImageClick(item.thumbnailImage)}
        />
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
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={5} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full px-3 sm:px-0">
        <div className="text-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-lg sm:text-xl text-black">
            Error Loading Add-Ons
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => fetchItems(1)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-black/80 transition text-sm hover:cursor-pointer"
          >
            Try Again
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
        title="Delete Add-On?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action is permanent and cannot be undone.`}
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
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:cursor-pointer"
            >
              <Link
                href={`/admin/addons/${menuItem._id}/edit`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Edit</span>
              </Link>
              <button
                onClick={() =>
                  handleToggleActive(menuItem._id, menuItem.isActive)
                }
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{menuItem.isActive ? "Deactivate" : "Activate"}</span>
              </button>
              <div className="border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  openDeleteModal(menuItem);
                }}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
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
          <h1 className="[font-family:var(--font-display)] text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight flex items-center gap-2">
            <Sparkles
              className="w-5 h-5 sm:w-6 sm:h-6 text-black"
              strokeWidth={1.5}
            />
            Add-Ons Management
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Create, update, and manage extra items and accessory products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/addons/new"
            className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white rounded-lg text-xs sm:text-sm hover:bg-gray-800 transition shadow-sm hover:cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Add Add-On</span>
            <span className="xs:hidden">Create an Addon</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Total Add-Ons
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {totalItems}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Active
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Inactive
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search add-ons by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={() => fetchItems(currentPage)}
          className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      {/* Table / List */}
      {items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-12 sm:py-16 px-4 text-center shadow-sm">
          <Sparkles
            className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3"
            strokeWidth={1}
          />
          <h3 className="text-sm font-medium text-black">No Add-Ons Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            {searchTerm
              ? "No products match your search query."
              : "Start by adding your first addon product using the button above."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500">
                <thead className="bg-gray-50/70 text-[10px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 sm:px-6 py-3">Name</th>
                    <th className="px-4 sm:px-6 py-3">Price</th>
                    <th className="px-4 sm:px-6 py-3">Stock</th>
                    <th className="px-4 sm:px-6 py-3">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="hover:bg-gray-50/50 transition"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getItemImage(item)}
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-black">
                              {item.name || "—"}
                            </span>
                            {item.nameAr && (
                              <span
                                className="block text-[10px] sm:text-xs text-gray-400 truncate"
                                dir="rtl"
                              >
                                {item.nameAr}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-medium text-black text-xs sm:text-sm">
                        {formatAED(item.price)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-black text-xs sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {item.stock}
                          {isLowStock(item.stock) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Low
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                            item.isActive
                              ? "bg-white text-black border border-black/30"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setMenuAnchor(e.currentTarget);
                            setMenuPosition({
                              top: rect.bottom + 8,
                              right: window.innerWidth - rect.right,
                            });
                            setMenuItem(item);
                          }}
                          className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {getItemImage(item)}
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                        {item.name || "—"}
                      </h3>
                      {item.nameAr && (
                        <h4
                          className="text-[10px] sm:text-xs text-gray-400 truncate"
                          dir="rtl"
                        >
                          {item.nameAr}
                        </h4>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.isActive
                            ? "bg-white text-black border border-black/30"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuAnchor(e.currentTarget);
                      setMenuPosition({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right,
                      });
                      setMenuItem(item);
                    }}
                    className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer shrink-0"
                    title="Actions"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <span className="font-medium text-black">
                      {formatAED(item.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Package className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>Stock: {item.stock}</span>
                    {isLowStock(item.stock) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Low
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
        totalItems={totalItems}
      />

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="AddOns Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
