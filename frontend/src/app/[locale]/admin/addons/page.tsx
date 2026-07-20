"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";
import toast from "react-hot-toast";

interface ToggleModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ToggleModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ToggleModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onCancel();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:cursor-pointer transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/80 hover:cursor-pointer transition"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default function AdminAddOnsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AddOnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AddOnItem | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<AddOnItem[]>("/api/admin/addons");
      setItems(data || []);
    } catch (err: any) {
      console.error("Failed to load addons:", err);
      setError(getApiErrorMessage(err, "Failed to load addons"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const data = await api.patch<{ success: boolean; isActive: boolean }>(
        `/api/admin/addons/${id}/toggle-active`
      );
      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isActive: data.isActive } : item
        )
      );
      toast.success(
        `Add-on ${data.isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to toggle status"));
    }
  };

  const openDeleteModal = (item: AddOnItem) => {
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
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Add-on deleted successfully");
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to delete addon"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(term) ||
        item.nameAr.toLowerCase().includes(term) ||
        item._id.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  const activeCount = useMemo(() => items.filter((i) => i.isActive).length, [items]);
  const inactiveCount = useMemo(() => items.filter((i) => !i.isActive).length, [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="[font-family:var(--font-display)] text-2xl md:text-3xl font-light text-black tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C9A84C]" strokeWidth={1.5} />
            Add-Ons Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create, update, and manage extra items and accessory products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/addons/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Add-On
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Total Add-Ons
          </p>
          <p className="text-2xl font-light text-black mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Active
          </p>
          <p className="text-2xl font-light text-black mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Inactive
          </p>
          <p className="text-2xl font-light text-black mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search add-ons by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchItems}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Error Loading Add-Ons</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Table / List */}
      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading add-ons...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 px-4 text-center shadow-sm">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1} />
          <h3 className="text-sm font-medium text-black">No Add-Ons Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            {searchTerm ? "No products match your search query." : "Start by adding your first addon product using the button above."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50/70 text-[10px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Name (EN / AR)</th>
                  <th className="px-6 py-4">Price (AED)</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden relative">
                        <img
                          src={item.thumbnailImage || "/placeholder.jpg"}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-black block text-sm">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-400 block mt-0.5">
                        {item.nameAr}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-black">
                      {item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-black">
                      {item.stock}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(item._id, item.isActive)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border hover:cursor-pointer transition-colors ${
                          item.isActive
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/addons/${item._id}`}
                          className="p-1 text-gray-400 hover:text-black transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openDeleteModal(item)}
                          disabled={deletingId === item._id}
                          className="p-1 text-gray-400 hover:text-red-600 transition disabled:opacity-50 hover:cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ToggleModal
        isOpen={modalOpen}
        title="Delete Add-On?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action is permanent and cannot be undone.`}
        confirmLabel="Delete Product"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
