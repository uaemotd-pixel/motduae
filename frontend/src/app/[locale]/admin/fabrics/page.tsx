"use client";

import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
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
  Store,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";

interface FabricItem {
  _id: string;
  name: string;
  material: string;
  pricePerMeter: number;
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

export default function AdminFabricsPage() {
  const params = useParams();
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FabricItem | null>(null);
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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.get<FabricItem[]>("/api/admin/fabrics");
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t.adminFabrics.list.load_error_title));
    } finally {
      setLoading(false);
    }
  };

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
      await fetchItems();
      closeDeleteModal();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete the item."));
      closeDeleteModal();
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const material = item.material?.toLowerCase() || "";
      const storeName =
        typeof item.listedByStore === "object"
          ? item.listedByStore.name?.toLowerCase() || ""
          : "";
      const storeId =
        typeof item.listedByStore === "string"
          ? item.listedByStore.toLowerCase()
          : "";
      const city = item.city?.toLowerCase() || "";
      return (
        name.includes(term) ||
        material.includes(term) ||
        storeName.includes(term) ||
        storeId.includes(term) ||
        city.includes(term)
      );
    });
  }, [items, searchTerm]);

  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.filter((i) => !i.isActive).length;

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
        <img
          src={item.images[0]}
          alt={item.name}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover hover:cursor-pointer"
          onClick={() => handleImageClick(item.images?.[0])}
        />
      );
    }
    return (
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 rounded"></div>
            <div className="h-8 sm:h-10 w-24 sm:w-28 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
              >
                <div className="h-3 sm:h-4 w-16 sm:w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 sm:h-7 w-12 sm:w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 sm:p-4 border-b border-gray-100">
                <div className="grid grid-cols-7 gap-4">
                  {[...Array(7)].map((_, j) => (
                    <div
                      key={j}
                      className="h-3 sm:h-4 bg-gray-200 rounded"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
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
            onClick={fetchItems}
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
            {items.length}
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

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.adminFabrics.list.search_placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchItems}
          className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white shrink-0 hover:cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">
            {t.adminFabrics.list.refresh}
          </span>
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm
              ? t.adminFabrics.list.empty_search
              : t.adminFabrics.list.empty}
          </p>
          {!searchTerm && (
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
                  {filteredItems.map((item) => (
                    <Fragment key={item._id}>
                      <tr className="group hover:bg-gray-50 transition-all duration-200">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getItemImage(item)}
                            <span className="text-sm font-medium text-black">
                              {item.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.material}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          AED {item.pricePerMeter.toLocaleString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getStoreDisplay(item.listedByStore)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.storePickupAddress.emirate || "—"}
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
                                      {item.variants.map((v) => (
                                        <tr
                                          key={v._id}
                                          className="hover:bg-gray-50/60 transition-colors"
                                        >
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs font-semibold text-black">
                                            <div className="flex items-center gap-2">
                                              {v.images &&
                                              v.images.length > 0 ? (
                                                <img
                                                  src={v.images[0]}
                                                  alt={v.name}
                                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover cursor-pointer"
                                                  onClick={() =>
                                                    handleImageClick(
                                                      v.images[0],
                                                    )
                                                  }
                                                />
                                              ) : (
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                  <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                                                </div>
                                              )}
                                              <span className="text-xs sm:text-sm">
                                                {v.name}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            {v.material}
                                          </td>
                                          <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                                            AED{" "}
                                            {v.pricePerMeter.toLocaleString()}
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
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {filteredItems.map((item) => (
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
                      <StatusBadge isActive={item.isActive} />
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
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>AED {item.pricePerMeter.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Store className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">
                      {getStoreDisplay(item.listedByStore)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>{item.storePickupAddress.emirate || "—"}</span>
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
                        {item.variants.map((v) => (
                          <div
                            key={v._id}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                {v.images && v.images.length > 0 ? (
                                  <img
                                    src={v.images[0]}
                                    alt={v.name}
                                    className="w-7 h-7 rounded-lg object-cover cursor-pointer"
                                    onClick={() =>
                                      handleImageClick(v.images[0])
                                    }
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-3 h-3 text-gray-400" />
                                  </div>
                                )}
                                <span className="text-xs font-medium truncate">
                                  {v.name}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleMenuOpen(e, v)}
                                className="text-gray-400 hover:text-black p-1"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-gray-600">
                              <span>Material: {v.material}</span>
                              <span>
                                Price: AED {v.pricePerMeter.toLocaleString()}
                              </span>
                              <span>
                                Store: {getStoreDisplay(v.listedByStore)}
                              </span>
                              <span>
                                City: {v.storePickupAddress?.emirate || "—"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
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
