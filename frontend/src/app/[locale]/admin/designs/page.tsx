"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api/client";
import { Link, useRouter } from "@/i18n/navigation";
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
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
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

const DEFAULT_LIMIT = 10;

function buildDesignListQuery(opts: {
  page: number;
  limit: number;
  search: string;
  tailorShopId: string;
}) {
  const params = new URLSearchParams();
  if (opts.page > 1) params.set("page", String(opts.page));
  if (opts.limit !== DEFAULT_LIMIT) params.set("limit", String(opts.limit));
  const search = opts.search.trim();
  if (search) params.set("search", search);
  if (opts.tailorShopId) params.set("tailorShopId", opts.tailorShopId);
  return params.toString();
}

function buildDesignListPath(opts: {
  page: number;
  limit: number;
  search: string;
  tailorShopId: string;
}) {
  const qs = buildDesignListQuery(opts);
  return qs ? `/admin/designs?${qs}` : "/admin/designs";
}

function InactiveNameBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-stone-100 text-stone-600 border border-stone-200/80 whitespace-nowrap">
      <EyeOff className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function getItemCode(item: AdminDesignProfile) {
  const code = typeof item.code === "string" ? item.code.trim() : "";
  return code || "N/A";
}

export default function AdminDesignsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const t = getTranslation(locale).adminDesigns;

  const [items, setItems] = useState<AdminDesignProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("search") || "",
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get("page"));
    return Number.isFinite(page) && page > 0 ? page : 1;
  });
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(() => {
    const value = Number(searchParams.get("limit"));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_LIMIT;
  });
  const [tailorShopId, setTailorShopId] = useState(
    () => searchParams.get("tailorShopId") || "",
  );
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
  const skipSearchEffect = useRef(true);
  const prevSearchTerm = useRef(searchTerm);

  const syncListUrl = useCallback(
    (opts: {
      page: number;
      limit: number;
      search: string;
      tailorShopId: string;
    }) => {
      if (typeof window !== "undefined") {
        const path = buildDesignListPath(opts);
        const localePrefix = window.location.pathname.match(/^\/(en|ar)(?=\/)/);
        const fullPath = localePrefix ? `${localePrefix[0]}${path}` : path;
        window.history.replaceState(
          window.history.state,
          "",
          `${fullPath}${window.location.hash}`,
        );
        return;
      }
      router.replace(buildDesignListPath(opts), { scroll: false });
    },
    [router],
  );

  const listStateQuery = useMemo(
    () =>
      buildDesignListQuery({
        page: currentPage,
        limit,
        search: searchTerm,
        tailorShopId,
      }),
    [currentPage, limit, searchTerm, tailorShopId],
  );

  const editHref = useCallback(
    (id: string) =>
      listStateQuery
        ? `/admin/designs/${id}/edit?${listStateQuery}`
        : `/admin/designs/${id}/edit`,
    [listStateQuery],
  );

  const detailsHref = useCallback(
    (id: string) =>
      listStateQuery
        ? `/admin/designs/${id}?${listStateQuery}`
        : `/admin/designs/${id}`,
    [listStateQuery],
  );

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
          syncListUrl({
            page: res.totalPages,
            limit: requestLimit,
            search: requestSearch,
            tailorShopId: requestTailorShopId,
          });
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
    [limit, searchTerm, tailorShopId, t.list.load_error_title, syncListUrl],
  );

  // Keep list state aligned with URL (e.g. return from edit with ?page=3)
  const urlSyncKey = searchParams.toString();
  const lastUrlSyncKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastUrlSyncKey.current === urlSyncKey) return;
    lastUrlSyncKey.current = urlSyncKey;

    const pageFromUrl = Number(searchParams.get("page"));
    const nextPage =
      Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
    const limitFromUrl = Number(searchParams.get("limit"));
    const nextLimit =
      Number.isFinite(limitFromUrl) && limitFromUrl > 0
        ? limitFromUrl
        : DEFAULT_LIMIT;
    const nextSearch = searchParams.get("search") || "";
    const nextTailorShopId = searchParams.get("tailorShopId") || "";

    setCurrentPage(nextPage);
    setLimit(nextLimit);
    setSearchTerm(nextSearch);
    setTailorShopId(nextTailorShopId);
    prevSearchTerm.current = nextSearch;
    void fetchItems(nextPage, true, nextLimit, nextSearch, nextTailorShopId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- driven by URL only
  }, [urlSyncKey]);

  // Debounced search resets to page 1. Ignore non-changes (Strict Mode / URL sync).
  useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      prevSearchTerm.current = searchTerm;
      return;
    }
    if (prevSearchTerm.current === searchTerm) return;
    prevSearchTerm.current = searchTerm;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      syncListUrl({
        page: 1,
        limit,
        search: searchTerm,
        tailorShopId,
      });
      void fetchItems(1, true, limit, searchTerm, tailorShopId);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleTailorFilterChange = (nextTailorShopId: string) => {
    setTailorShopId(nextTailorShopId);
    setCurrentPage(1);
    setOpenTailorFilter(false);
    syncListUrl({
      page: 1,
      limit,
      search: searchTerm,
      tailorShopId: nextTailorShopId,
    });
    void fetchItems(1, false, limit, searchTerm, nextTailorShopId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    syncListUrl({
      page,
      limit,
      search: searchTerm,
      tailorShopId,
    });
    void fetchItems(page, false, limit, searchTerm, tailorShopId);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
    syncListUrl({
      page: 1,
      limit: newLimit,
      search: searchTerm,
      tailorShopId,
    });
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
              onClick={() => handleTailorFilterChange("")}
            >
              {t.list.filter_tailor_all}
            </button>
            {tailorShops.map((shop) => (
              <button
                key={shop._id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer truncate"
                onClick={() => handleTailorFilterChange(shop._id)}
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
                  <th className="px-4 py-3">{t.list.col_code}</th>
                  <th className="px-4 py-3">{t.list.col_name}</th>
                  <th className="px-4 py-3">{t.list.col_tailor}</th>
                  <th className="px-4 py-3">{t.list.col_category}</th>
                  <th className="px-4 py-3">{t.list.col_price}</th>
                  <th className="px-4 py-3 text-right">{t.list.col_actions}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemInactive = item.isActive === false;
                  return (
                    <tr
                      key={item._id}
                      className={`border-t border-gray-100 transition-all duration-200 ${
                        itemInactive
                          ? "bg-stone-50/90 hover:bg-stone-100/80"
                          : "hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600">
                        {getItemCode(item)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {getItemImage(item)}
                          <div className="min-w-0">
                            <p
                              className={`font-medium truncate ${
                                itemInactive ? "text-stone-600" : ""
                              }`}
                            >
                              {item.name}
                            </p>
                            {itemInactive && (
                              <div className="mt-1">
                                <InactiveNameBadge
                                  label={t.list.status_inactive}
                                />
                              </div>
                            )}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {items.map((item) => {
              const itemInactive = item.isActive === false;
              return (
                <div
                  key={item._id}
                  className={`rounded-2xl border p-4 ${
                    itemInactive
                      ? "bg-stone-50 border-stone-200"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {getItemImage(item)}
                      <div className="min-w-0">
                        <p
                          className={`font-medium truncate ${
                            itemInactive ? "text-stone-600" : ""
                          }`}
                        >
                          {item.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] text-gray-500">
                            {getItemCode(item)}
                          </span>
                          {itemInactive && (
                            <InactiveNameBadge
                              label={t.list.status_inactive}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-1">
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
                  </div>
                </div>
              );
            })}
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
                href={detailsHref(menuItem._id)}
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
                href={editHref(menuItem._id)}
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
