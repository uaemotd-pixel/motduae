"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";

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

export default function AdminReadyMadePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReadyMadeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<ReadyMadeItem | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.get<ReadyMadeItem[]>("/api/admin/ready-made");
      setItems(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch ready-made items:", err);
      setError(err.message || "Failed to load ready-made items");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const fabricType = item.fabricType?.toLowerCase() || "";
      const tailorName = item.tailorName?.toLowerCase() || "";
      const priceStr = String(item.finalSellingPriceAED || 0);
      const status = item.availableFabricStock > 0 ? "available" : "sold";
      return (
        name.includes(term) ||
        fabricType.includes(term) ||
        tailorName.includes(term) ||
        priceStr.includes(term) ||
        status.includes(term)
      );
    });
  }, [items, searchTerm]);

  const availableItems = items.filter((i) => i.availableFabricStock > 0).length;
  const soldItems = items.filter((i) => i.availableFabricStock === 0).length;

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
      return (
        <img
          src={item.images[0]}
          alt={item.name}
          className="w-10 h-10 rounded-lg object-cover hover:cursor-pointer"
          onClick={() =>
            handleImageClick(item.images?.[0] || "IMAGE NOT FOUND")
          }
        />
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
      await api.delete(`/api/admin/ready-made/${id}`);
      toast.success(`"${itemName}" has been deleted`);
      await fetchItems();
      closeDeleteModal();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete the item."));
      closeDeleteModal();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-7 w-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-6 gap-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded"></div>
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
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-xl text-black">
            Unable to load ready-made items
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={fetchItems}
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
                href={`/admin/ready-made/${menuItem._id}/edit`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <Edit className="w-4 h-4 shrink-0" />
                <span>Edit</span>
              </Link>
              <Link
                href={`/admin/ready-made/${menuItem._id}`}
                onClick={() => {
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Details</span>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Ready-made Inventory
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage ready‑made pieces and their availability
          </p>
        </div>
        <Link
          href="/admin/ready-made/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create new
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Total items
          </p>
          <p className="text-2xl font-light text-black mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Available
          </p>
          <p className="text-2xl font-light text-black mt-1">
            {availableItems}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Sold</p>
          <p className="text-2xl font-light text-black mt-1">{soldItems}</p>
        </div>
      </div>

      {/* Search & refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, fabric, tailor, price, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchItems}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No items match your search."
              : "No ready-made items yet."}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/ready-made/new"
              className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600"
            >
              Create your first item
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                {filteredItems.map((item) => {
                  const status =
                    item.availableFabricStock > 0 ? "available" : "sold";
                  return (
                    <tr
                      key={item._id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getItemImage(item)}
                          <span className="text-sm font-medium text-black">
                            {item.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.fabricType || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.tailorName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        <span className="text-gray-500">
                          AED {item.finalSellingPriceAED}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.availableFabricStock}
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
      )}

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Ready Made Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
