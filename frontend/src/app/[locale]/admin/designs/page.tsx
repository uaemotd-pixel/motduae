"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Search,
  RefreshCw,
  Eye,
  Image as ImageIcon,
  MoreVertical,
  Maximize2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import { resolveMediaUrl } from "@/lib/media";
import {
  deleteAdminDesign,
  fetchAdminDesigns,
  fetchAdminTailorShops,
  getDesignTailorShopName,
  type AdminDesignProfile,
  type AdminTailorShopOption,
} from "@/lib/adminDesigns";
import AnimatedDropdown from "@/components/shared/AnimatedDropdown";

export default function AdminDesignsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslation(locale).adminDesigns;

  const [items, setItems] = useState<AdminDesignProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [tailorShopId, setTailorShopId] = useState("");
  const [tailorShops, setTailorShops] = useState<AdminTailorShopOption[]>([]);
  const [openTailorFilter, setOpenTailorFilter] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<AdminDesignProfile | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AdminDesignProfile | null>(
    null,
  );
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  useEffect(() => {
    void fetchAdminTailorShops()
      .then(setTailorShops)
      .catch(() => setTailorShops([]));
  }, []);

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
      requestTailorShopId = tailorShopId,
    ) => {
      try {
        if (showLoading && isInitialLoad.current) {
          setLoading(true);
        }

        const res = await fetchAdminDesigns({
          page,
          limit: requestLimit,
          search: requestSearch,
          tailorShopId: requestTailorShopId || undefined,
        });

        setItems(res.items ?? []);
        setTotalPages(res.totalPages ?? 0);
        setCurrentPage(res.page ?? page);
        setTotal(res.total ?? 0);
        setError(null);
        isInitialLoad.current = false;

        if (res.page > res.totalPages && res.totalPages > 0) {
          await fetchItems(
            res.totalPages,
            false,
            requestLimit,
            requestSearch,
            requestTailorShopId,
          );
        }
      } catch (err) {
        setError(getApiErrorMessage(err, t.list.load_error_title));
      } finally {
        setLoading(false);
      }
    },
    [limit, searchTerm, tailorShopId, t.list.load_error_title],
  );

  useEffect(() => {
    void fetchItems(1, true);
  }, [fetchItems]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialLoad.current) {
        setCurrentPage(1);
        void fetchItems(1, true, limit, searchTerm, tailorShopId);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, limit, tailorShopId, fetchItems]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void fetchItems(page, false, limit, searchTerm, tailorShopId);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    void fetchItems(1, true, newLimit, searchTerm, tailorShopId);
  };

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: AdminDesignProfile,
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
    <Tag size="md" variant={isActive ? "outline" : "muted"}>
      {isActive ? t.list.status_active : t.list.status_inactive}
    </Tag>
  );

  const getItemImage = (item: AdminDesignProfile) => {
    const src = item.images?.[0] ? resolveMediaUrl(item.images[0]) : "";
    if (src) {
      return (
        <div
          className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden group cursor-pointer shrink-0"
          onClick={() => handleImageClick(src)}
        >
          <img
            src={src}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
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

  const openDeleteModal = (item: AdminDesignProfile) => {
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
    const itemName = itemToDelete.name || "Design";
    setDeletingId(id);
    try {
      await deleteAdminDesign(id);
      toast.success(`"${itemName}" has been deleted`);
      await fetchItems(currentPage, false, limit, searchTerm, tailorShopId);
      closeDeleteModal();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t.list.delete_failed));
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
            {t.list.load_error_title}
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
          <button
            onClick={() => fetchItems(1, true)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm hover:cursor-pointer"
          >
            {t.list.try_again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.list.title}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {t.list.subtitle}
          </p>
        </div>
        <Link
          href="/admin/designs/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm hover:cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t.list.new_button}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.list.search_placeholder}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
          />
        </div>
        <div className="sm:w-56">
          <AnimatedDropdown
            isOpen={openTailorFilter}
            onClose={() => setOpenTailorFilter(false)}
            trigger={
              <button
                type="button"
                onClick={() => setOpenTailorFilter((prev) => !prev)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between gap-2 hover:cursor-pointer bg-white"
              >
                <span className="truncate flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {tailorShopId
                    ? tailorShops.find((s) => s._id === tailorShopId)?.name ||
                      t.list.filter_tailor_placeholder
                    : t.list.filter_tailor_all}
                </span>
                <span className="text-gray-400">▾</span>
              </button>
            }
            dropdownClassName="w-full bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto py-1"
            position="bottom-left"
          >
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer"
              onClick={() => {
                setTailorShopId("");
                setOpenTailorFilter(false);
              }}
            >
              {t.list.filter_tailor_all}
            </button>
            {tailorShops.map((shop) => (
              <button
                key={shop._id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer truncate"
                onClick={() => {
                  setTailorShopId(shop._id);
                  setOpenTailorFilter(false);
                }}
              >
                {shop.name}
              </button>
            ))}
          </AnimatedDropdown>
        </div>
        <button
          type="button"
          onClick={() =>
            fetchItems(currentPage, true, limit, searchTerm, tailorShopId)
          }
          className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 hover:cursor-pointer"
          title={t.list.refresh}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {t.list.total}: {total}
      </p>

      {items.length === 0 ? (
        <div className="text-center bg-white p-8 rounded-2xl border border-gray-100">
          <p className="text-gray-500 text-sm">
            {searchTerm || tailorShopId ? t.list.empty_search : t.list.empty}
          </p>
          {!searchTerm && !tailorShopId && (
            <Link
              href="/admin/designs/new"
              className="inline-block mt-4 text-sm underline hover:cursor-pointer"
            >
              {t.list.create_first}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t.list.col_name}</th>
                  <th className="px-4 py-3">{t.list.col_tailor}</th>
                  <th className="px-4 py-3">{t.list.col_category}</th>
                  <th className="px-4 py-3">{t.list.col_price}</th>
                  <th className="px-4 py-3">{t.list.col_status}</th>
                  <th className="px-4 py-3 text-right">{t.list.col_actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-t border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {getItemImage(item)}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {item.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 truncate max-w-40">
                      {getDesignTailorShopName(item, locale)}
                    </td>
                    <td className="px-4 py-3">{item.category || "—"}</td>
                    <td className="px-4 py-3">
                      {Number(item.basePrice || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={item.isActive} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => handleMenuOpen(e, item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 hover:cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {getItemImage(item)}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {getDesignTailorShopName(item, locale)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleMenuOpen(e, item)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 hover:cursor-pointer shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-600">
                  <span>{item.category || "—"}</span>
                  <span>{Number(item.basePrice || 0).toFixed(2)} AED</span>
                  <StatusBadge isActive={item.isActive} />
                </div>
              </div>
            ))}
          </div>

          <GlobalPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showItemsPerPage
            itemsPerPage={limit}
            onItemsPerPageChange={handleLimitChange}
            totalItems={total}
          />
        </>
      )}

      {menuPosition &&
        menuItem &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: "fixed",
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              className="z-50 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 overflow-hidden"
            >
              <Link
                href={`/admin/designs/${menuItem._id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer"
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
              >
                <Eye className="w-4 h-4" />
                View
              </Link>
              <Link
                href={`/admin/designs/${menuItem._id}/edit`}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer"
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                type="button"
                disabled={deletingId === menuItem._id}
                onClick={() => openDeleteModal(menuItem)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      <ConfirmationModal
        isOpen={modalOpen}
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Delete design"
        message={t.list.delete_confirm}
        confirmLabel={deletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isLoading={Boolean(deletingId)}
        isDanger
      />

      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageUrl={selectedImage}
        alt="Design"
      />
    </div>
  );
}
