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
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";

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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const isInitialLoad = useRef(true);
  const [limit, setLimit] = useState(10);

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
        setMenuCustomer(null);
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
          `/api/admin/customers?page=${page}&limit=${requestLimit}&status=${status}&search=${encodeURIComponent(requestSearch)}`,
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
        setError(getApiErrorMessage(err, "Failed to load customers"));
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

  const handleTabChange = (tab: "all" | "active" | "inactive") => {
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
    setMenuAnchor(null);
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
      void fetchItems(currentPage, false, limit, searchTerm, activeTab);
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

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    customer: Customer,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuCustomer(customer);
  };

  const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
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
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover hover:cursor-pointer"
          onClick={() =>
            handleImageClick(customer?.profilePic || "IMAGE NOT FOUND")
          }
        />
      );
    }

    const gender = customer.gender?.toLowerCase();
    if (gender === "male") {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
      );
    }
    if (gender === "female") {
      return (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
          <VenusAndMars className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
      </div>
    );
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div className="h-6 sm:h-8 w-32 sm:w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[...Array(4)].map((_, i) => (
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
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
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
            Unable to load customers
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
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:cursor-pointer"
            >
              <button
                onClick={() => {
                  toast.success(`Viewing details for "${menuCustomer.name}"`);
                  setMenuPosition(null);
                  setMenuCustomer(null);
                  setMenuAnchor(null);
                }}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Details</span>
              </button>
              <button
                onClick={() => {
                  openModal("toggle", menuCustomer);
                }}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>{menuCustomer.isActive ? "Deactivate" : "Activate"}</span>
              </button>
              <div className="border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  openModal("delete", menuCustomer);
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Customers
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage and view all registered customers
          </p>
        </div>
      </div>

      {/* Stats cards - 2 per row on mobile */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Total
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.totalCustomers}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Active
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.active}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              Inactive
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.inactive}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
              New This Month
            </p>
            <p className="text-xl sm:text-2xl font-light text-black mt-1">
              {stats.newThisMonth}
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
            onClick={() => handleTabChange("active")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              activeTab === "active"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleTabChange("inactive")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              activeTab === "inactive"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Inactive
          </button>
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchItems(currentPage, true)}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Table - Desktop */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm
              ? "No customers match your search."
              : "No customers registered yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
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
                  {items.map((customer) => (
                    <tr
                      key={customer._id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getAvatar(customer)}
                          <span className="text-xs sm:text-sm font-medium text-black">
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                        {customer.email}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 font-mono">
                        {customer.phone || "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <StatusBadge isActive={customer.isActive} />
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => handleMenuOpen(e, customer)}
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

          {/* Mobile Cards - visible on mobile only */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {items.map((customer) => (
              <div
                key={customer._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {getAvatar(customer)}
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                        {customer.name}
                      </h3>
                      <StatusBadge isActive={customer.isActive} />
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleMenuOpen(e, customer)}
                    className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer shrink-0"
                    title="Actions"
                  >
                    <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="text-xs sm:text-sm">
                      {customer.phone || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="text-xs sm:text-sm">
                      Joined {formatDate(customer.createdAt)}
                    </span>
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
        itemsPerPageOptions={[2, 5, 10, 20, 50, 100]}
        totalItems={stats?.totalCustomers}
      />

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Customer image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
