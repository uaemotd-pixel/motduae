"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  Users,
  AlertCircle,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Store,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import FormField from "@/components/admin/FormField";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

// ---------- Types ----------
interface FabricRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  type: "approved" | "pending" | "rejected";
  shopName: string | null;
  isActive: boolean;
  phone?: string;
  logo?: string;
}

interface ApprovedShop {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  logo?: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
    approvalStatus: string;
    profilePic?: string;
  } | null;
}

interface ApprovedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  profilePic?: string;
}

interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  profilePic?: string;
}

interface ApiResponse {
  items: FabricRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------- Modals ----------
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 p-6 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-medium text-black">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/80 transition hover:cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApprovalModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  showNote?: boolean;
  noteValue?: string;
  onNoteChange?: (val: string) => void;
  notePlaceholder?: string;
}

function ApprovalModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  showNote = false,
  noteValue = "",
  onNoteChange,
  notePlaceholder = "Write something...",
}: ApprovalModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onCancel();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 p-6 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-medium text-black">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>

        {showNote && onNoteChange && (
          <div className="mt-4">
            <textarea
              className="w-full min-h-25 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-black resize-y"
              placeholder={notePlaceholder}
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/80 transition hover:cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Partner Creation Modal
type PartnerFormData = {
  name: string;
  email: string;
  password?: string;
  shopName: string;
};

interface PartnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartnerFormData) => Promise<void>;
  loading?: boolean;
}

function PartnerFormModal({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: PartnerFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setShopName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, password, shopName });
  };

  const inputClassName =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black transition";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 p-6">
        <h2 className="text-xl font-light text-black tracking-tight">
          Add Fabric Store Partner
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <FormField label="Store Name" name="shopName" required>
            <input
              id="shopName"
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
              placeholder="e.g. Luxury Velvet Store"
              className={inputClassName}
            />
          </FormField>
          <FormField label="Owner Name" name="name" required>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. John Doe"
              className={inputClassName}
            />
          </FormField>
          <FormField label="Email" name="email" required>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. john@example.com"
              className={inputClassName}
            />
          </FormField>
          <FormField label="Password" name="password" required>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className={inputClassName}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/80 transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const params = useParams();
  const localeParam = params.locale as string;

  const [rows, setRows] = useState<FabricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "approved" | "pending" | "rejected"
  >("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  // Menu state
  const [menuItem, setMenuItem] = useState<FabricRow | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [toggleModalOpen, setToggleModalOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{
    shopId: string;
    shopName: string;
    currentStatus: boolean;
  } | null>(null);

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [selectedPending, setSelectedPending] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
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

  const fetchData = useCallback(
    async (
      page = 1,
      limitOverride?: number,
      tabOverride = activeTab,
      showLoading = true,
    ) => {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      try {
        const l = limitOverride || limit;
        const search = searchTerm
          ? `&search=${encodeURIComponent(searchTerm)}`
          : "";
        const tabFilter = tabOverride !== "all" ? `&type=${tabOverride}` : "";

        const res = await api.get<ApiResponse>(
          `/api/admin/partners?page=${page}&limit=${l}${search}${tabFilter}`,
        );

        setRows(res.items || []);
        setTotalItems(res.total || 0);
        setCurrentPage(res.page || 1);
        setTotalPages(res.totalPages || 0);

        const statsRes = await api.get<{
          total: number;
          approved: number;
          pending: number;
          rejected: number;
        }>("/api/admin/partners/stats");

        setStats({
          total: statsRes.total || 0,
          approved: statsRes.approved || 0,
          pending: statsRes.pending || 0,
          rejected: statsRes.rejected || 0,
        });
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load partners"));
        toast.error("Failed to load data");
        setRows([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [searchTerm, activeTab, limit],
  );

  // Initial load - runs once
  useEffect(() => {
    void fetchData(1).finally(() => {
      isInitialLoad.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search - only searchTerm triggers
  useEffect(() => {
    if (isInitialLoad.current) {
      return;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchData(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleCreate = async (data: PartnerFormData) => {
    setFormLoading(true);
    try {
      await api.post("/api/admin/create-partners", data);
      toast.success("Partner created successfully");
      setFormModalOpen(false);
      fetchData(1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create partner"));
    } finally {
      setFormLoading(false);
    }
  };

  const getAvatar = (row: FabricRow) => {
    if (row.logo) {
      return (
        <img
          src={row.logo}
          alt={row.name}
          className="w-9 h-9 rounded-full object-cover hover:cursor-pointer"
          onClick={() => handleImageClick(row.logo as string)}
        />
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
        <Store className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  const openToggleModal = (
    shopId: string,
    shopName: string,
    currentStatus: boolean,
  ) => {
    setMenuPosition(null);
    setMenuItem(null);
    setPendingToggle({ shopId, shopName, currentStatus });
    setToggleModalOpen(true);
  };

  const executeToggle = async () => {
    if (!pendingToggle) return;
    const { shopId, shopName, currentStatus } = pendingToggle;
    const newStatus = !currentStatus;
    const actionVerb = newStatus ? "reactivated" : "deactivated";

    setActionInProgress(shopId);
    setToggleModalOpen(false);

    try {
      await api.patch(`/api/admin/fabric-shops/${shopId}/deactivate`, {
        isActive: newStatus,
      });

      await fetchData(currentPage);
      toast.success(`Shop "${shopName}" ${actionVerb}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Failed to ${actionVerb} shop`));
    } finally {
      setActionInProgress(null);
      setPendingToggle(null);
    }
  };

  const cancelToggle = () => {
    setToggleModalOpen(false);
    setPendingToggle(null);
  };

  const openApprovalModal = (
    action: "approve" | "reject",
    storeId: string,
    storeName: string,
  ) => {
    setMenuPosition(null);
    setMenuItem(null);
    setApprovalAction(action);
    setSelectedPending({ id: storeId, name: storeName });
    setRejectNote("");
    setApprovalModalOpen(true);
  };

  const closeApprovalModal = () => {
    setApprovalModalOpen(false);
    setApprovalAction(null);
    setSelectedPending(null);
    setRejectNote("");
  };

  const executeApproval = async () => {
    if (!selectedPending || !approvalAction) return;
    const { id, name } = selectedPending;

    setActionInProgress(id);
    closeApprovalModal();

    try {
      if (approvalAction === "approve") {
        await api.patch(`/api/admin/fabric-stores/${id}/approve`);
        toast.success(`Fabric store "${name}" approved`);
        await fetchData(currentPage);
      } else {
        await api.patch(`/api/admin/fabric-stores/${id}/reject`, {
          rejectionNote: rejectNote,
          note: rejectNote,
        });
        toast.success(`Fabric store "${name}" rejected`);
        await fetchData(currentPage);
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, `Failed to ${approvalAction} partner`),
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePageChange = (page: number) => {
    fetchData(page, undefined, activeTab, false);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    fetchData(1, newLimit, activeTab, false);
  };

  const handleTabChange = (
    tab: "all" | "approved" | "pending" | "rejected",
  ) => {
    setActiveTab(tab);
    setCurrentPage(1);
    fetchData(1, undefined, tab, false);
  };

  const filteredRows = useMemo(() => {
    return rows;
  }, [rows]);

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(
      localeParam === "ar" ? "ar-AE" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  };

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={7} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-8 rounded-2xl border border-gray-100 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-black">Failed to load partners</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => fetchData(1)}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-black/80 transition text-sm hover:cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      <ToggleModal
        isOpen={toggleModalOpen}
        title={
          pendingToggle?.currentStatus ? "Deactivate Shop" : "Reactivate Shop"
        }
        message={`Are you sure you want to ${pendingToggle?.currentStatus ? "deactivate" : "reactivate"} "${pendingToggle?.shopName || "this shop"}"?`}
        confirmLabel={
          pendingToggle?.currentStatus ? "Deactivate" : "Reactivate"
        }
        cancelLabel="Cancel"
        onConfirm={executeToggle}
        onCancel={cancelToggle}
      />

      <ApprovalModal
        isOpen={approvalModalOpen}
        title={
          approvalAction === "approve"
            ? `Approve "${selectedPending?.name || "Fabric Store"}"`
            : `Reject "${selectedPending?.name || "Fabric Store"}"`
        }
        message={
          approvalAction === "approve"
            ? "This store will be able to set up their shop profile and list fabrics."
            : "Explain a reason of rejection *"
        }
        confirmLabel={approvalAction === "approve" ? "Approve" : "Reject"}
        cancelLabel="Cancel"
        onConfirm={executeApproval}
        onCancel={closeApprovalModal}
        showNote={approvalAction === "reject"}
        noteValue={rejectNote}
        onNoteChange={setRejectNote}
        notePlaceholder="Rejection reason..."
      />

      <PartnerFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleCreate}
        loading={formLoading}
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
              className="w-fit bg-white rounded-xl shadow-lg border border-gray-200 py-1 overflow-hidden"
            >
              <button
                onClick={() => {
                  toast.success(`Viewing details for "${menuItem.name}"`);
                  setMenuPosition(null);
                  setMenuItem(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Details</span>
              </button>
              {menuItem.type === "pending" && (
                <>
                  <button
                    onClick={() => {
                      openApprovalModal("approve", menuItem.id, menuItem.name);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors text-left"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => {
                      openApprovalModal("reject", menuItem.id, menuItem.name);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Reject</span>
                  </button>
                </>
              )}
              {menuItem.type === "rejected" && (
                <button
                  onClick={() => {
                    openApprovalModal("approve", menuItem.id, menuItem.name);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors text-left"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Approve</span>
                </button>
              )}
              {menuItem.type === "approved" && (
                <button
                  onClick={() => {
                    openToggleModal(
                      menuItem.id,
                      menuItem.shopName || "Shop",
                      menuItem.isActive || false,
                    );
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left hover:cursor-pointer ${
                    menuItem.isActive
                      ? "text-red-600 hover:bg-red-50"
                      : "text-green-700 hover:bg-green-50"
                  }`}
                >
                  <Store className="w-4 h-4 shrink-0" />
                  <span>{menuItem.isActive ? "Deactivate" : "Reactivate"}</span>
                </button>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Fabric Store Partners
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage fabric store partner accounts – approvals and active shops.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData(currentPage)}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setFormModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition text-sm hover:cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          key="total"
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase">Total</p>
          <p className="text-2xl font-light text-black mt-1">{stats.total}</p>
        </div>
        <div
          key="approved"
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase">Approved</p>
          <p className="text-2xl font-light text-black mt-1">
            {stats.approved}
          </p>
        </div>
        <div
          key="pending"
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase">Pending</p>
          <p className="text-2xl font-light text-black mt-1">{stats.pending}</p>
        </div>
        <div
          key="rejected"
          className="bg-white rounded-2xl p-4 border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase">Rejected</p>
          <p className="text-2xl font-light text-black mt-1">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(["all", "approved", "pending", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-all capitalize hover:cursor-pointer ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-750 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or shop..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
        />
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            No partners found matching the criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop
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
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => {
                  const isPending = row.type === "pending";
                  const isRejected = row.type === "rejected";

                  let statusBadge;
                  if (isPending) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </span>
                    );
                  } else if (isRejected) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Rejected
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    );
                  }

                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getAvatar(row)}
                          <span className="text-sm font-medium text-black">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                        {row.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.shopName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {statusBadge}
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
                            setMenuItem(row);
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

      {/* Pagination */}
      {totalPages > 0 && totalItems > 0 && (
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
      )}

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Fabric Store Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
