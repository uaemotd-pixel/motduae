"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import {
  AlertCircle,
  Search,
  RefreshCw,
  User,
  Trash2,
  Power,
  MoreHorizontal,
  Eye,
  VenusAndMars,
} from "lucide-react";
import toast from "react-hot-toast";
import { ImageModal } from "@/components/shared/ImageModal";

// ============================================
// Reusable Confirmation Modal
// ============================================
type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
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
              className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer"
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer"
              disabled={isLoading}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Types
// ============================================
type Customer = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  profilePic?: string | null;
  gender?: string | null;
};

type Stats = {
  totalCustomers: number;
  active: number;
  inactive: number;
  newThisMonth: number;
};

type ApiResponse = {
  success: boolean;
  items: Customer[];
  stats: Stats;
  page: number;
  totalPages: number;
  total: number;
};

type ModalAction = "delete" | "toggle";

// ============================================
// Main Component
// ============================================
export default function AdminCustomersPage() {
  const params = useParams();
  const localeParam = params.locale as string;

  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [menuCustomer, setMenuCustomer] = useState<Customer | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  // pop up image function
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    action: ModalAction;
    customer: Customer | null;
  }>({ action: "delete", customer: null });

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPosition(null);
        setMenuCustomer(null);
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
        setMenuCustomer(null);
      }
    }
    if (menuPosition) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuPosition]);

  const fetchItems = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const status = activeTab === "all" ? "" : activeTab;
        const res = await api.get<ApiResponse>(
          `/api/admin/customers?page=${page}&limit=10&status=${status}&search=${encodeURIComponent(searchTerm)}`,
        );
        setItems(res.items);
        setStats(res.stats);
        setTotalPages(res.totalPages);
        setCurrentPage(res.page);
        setError(null);
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load customers"));
      } finally {
        setLoading(false);
      }
    },
    [activeTab, searchTerm],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchItems]);

  useEffect(() => {
    fetchItems(1);
  }, [activeTab]);

  const handleTabChange = (tab: "all" | "active" | "inactive") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchItems(newPage);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(localeParam === "ar" ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openModal = (action: ModalAction, customer: Customer) => {
    setMenuPosition(null);
    setMenuCustomer(null);
    setModalConfig({ action, customer });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalConfig({ action: "delete", customer: null });
  };

  const handleConfirm = async () => {
    const { action, customer } = modalConfig;
    if (!customer) return;
    const id = customer._id;
    const name = customer.name;

    setActionLoading(id);

    try {
      if (action === "delete") {
        await api.delete(`/api/admin/customers/${id}`);
        toast.success(`"${name}" deleted successfully`);
      } else if (action === "toggle") {
        const res = await api.patch<{ isActive: boolean }>(
          `/api/admin/customers/${id}/toggle-active`,
        );
        toast.success(
          `Customer ${res.isActive ? "activated" : "deactivated"} successfully`,
        );
      }
      closeModal();
      fetchItems(currentPage);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          `Failed to ${action === "delete" ? "delete" : "change status"}`,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-white text-black border border-black/30"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );

  const getAvatar = (customer: Customer) => {
    if (customer.profilePic) {
      return (
        <img
          src={customer.profilePic}
          alt={customer.name}
          className="w-9 h-9 rounded-full object-cover hover:cursor-pointer"
          onClick={() =>
            handleImageClick(customer?.profilePic || "IMAGE NOT FOUND")
          }
        />
      );
    }

    const gender = customer.gender?.toLowerCase();
    if (gender === "male") {
      return (
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
      );
    }
    if (gender === "female") {
      return (
        <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
          <VenusAndMars className="w-5 h-5 text-pink-600" />
        </div>
      );
    }

    return (
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
        <User className="w-5 h-5 text-gray-500" />
      </div>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
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
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
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
            Unable to load customers
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
        title={
          modalConfig.action === "delete"
            ? "Delete Customer"
            : modalConfig.customer?.isActive
              ? "Deactivate Customer"
              : "Activate Customer"
        }
        message={
          modalConfig.action === "delete"
            ? `Are you sure you want to delete "${modalConfig.customer?.name}"? This action cannot be undone.`
            : modalConfig.customer?.isActive
              ? `Are you sure you want to deactivate "${modalConfig.customer?.name}"? They will lose access.`
              : `Are you sure you want to activate "${modalConfig.customer?.name}"?`
        }
        confirmLabel={
          modalConfig.action === "delete"
            ? "Delete"
            : modalConfig.customer?.isActive
              ? "Deactivate"
              : "Activate"
        }
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={closeModal}
        isLoading={actionLoading === modalConfig.customer?._id}
      />

      {/* Floating Menu Portal */}
      {menuPosition &&
        menuCustomer &&
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
              className="w-fit bg-white rounded-xl shadow-lg border border-gray-200 py-1 overflow-hidden hover:cursor-pointer"
            >
              <button
                onClick={() => {
                  toast.success(`Viewing details for "${menuCustomer.name}"`);
                  setMenuPosition(null);
                  setMenuCustomer(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Details</span>
              </button>
              <button
                onClick={() => {
                  openModal("toggle", menuCustomer);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer"
              >
                <Power className="w-4 h-4 shrink-0" />
                <span>{menuCustomer.isActive ? "Deactivate" : "Activate"}</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  openModal("delete", menuCustomer);
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
            Customers
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and view all registered customers
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Total
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {stats.totalCustomers}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Active
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {stats.active}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Inactive
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {stats.inactive}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              New This Month
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {stats.newThisMonth}
            </p>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTabChange("active")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "active"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleTabChange("inactive")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "inactive"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Inactive
          </button>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchItems(currentPage)}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No customers match your search."
              : "No customers registered yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
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
                {items.map((customer) => (
                  <tr
                    key={customer._id}
                    className="group hover:bg-gray-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getAvatar(customer)}
                        <span className="text-sm font-medium text-black">
                          {customer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {customer.phone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge isActive={customer.isActive} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPosition({
                            top: rect.bottom + 8,
                            right: window.innerWidth - rect.right,
                          });
                          setMenuCustomer(customer);
                        }}
                        className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                        title="Actions"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Customer image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
