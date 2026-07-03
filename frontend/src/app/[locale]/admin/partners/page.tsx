"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import FormField from "@/components/admin/FormField";

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
}

interface ApprovedShop {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
    approvalStatus: string;
  } | null;
}

interface ApprovedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
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
              className="w-full min-h-[100px] border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-black resize-y"
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
          <FormField
            label="Password"
            name="password"
            required
          >
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
  const [activeTab, setActiveTab] = useState<"all" | "approved" | "pending" | "rejected">("all");

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

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
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [selectedPending, setSelectedPending] = useState<{ id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const approvedShopsRes = await api.get<{ items: ApprovedShop[] }>("/api/admin/fabric-shops");
      const approvedShops = approvedShopsRes.items || [];

      const approvedUsersRes = await api.get<{ items: ApprovedUser[] }>("/api/admin/fabric-stores/approved-users");
      const approvedUsers = approvedUsersRes.items || [];

      const pendingRes = await api.get<any[]>("/api/admin/fabric-stores/pending");
      const pending = Array.isArray(pendingRes) ? pendingRes : [];

      const rejectedRes = await api.get<{ items: RejectedUser[] }>("/api/admin/fabric-stores/rejected-stores");
      const rejectedUsers = rejectedRes.items || [];

      const shopOwnerIds = new Set(
        approvedShops.map((shop) => shop.ownerId?._id).filter(Boolean)
      );

      const shopRows: FabricRow[] = approvedShops.map((shop) => ({
        id: shop._id,
        name: shop.ownerId?.name || "—",
        email: shop.ownerId?.email || "—",
        createdAt: shop.createdAt,
        type: "approved",
        shopName: shop.name,
        isActive: shop.isActive,
      }));

      const approvedUserRows: FabricRow[] = approvedUsers
        .filter((user) => !shopOwnerIds.has(user._id))
        .map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          type: "approved",
          shopName: null,
          isActive: false,
        }));

      const pendingRows: FabricRow[] = pending.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        type: "pending",
        phone: user.phone || "",
        shopName: null,
        isActive: false,
      }));

      const rejectedRows: FabricRow[] = rejectedUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        type: "rejected",
        shopName: null,
        isActive: false,
      }));

      const combined = [
        ...shopRows,
        ...approvedUserRows,
        ...pendingRows,
        ...rejectedRows,
      ];

      setRows(combined);

      const approvedCount = approvedShops.length + approvedUsers.filter((u) => !shopOwnerIds.has(u._id)).length;
      setStats({
        total: approvedCount + pending.length + rejectedUsers.length,
        approved: approvedCount,
        pending: pending.length,
        rejected: rejectedUsers.length,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load partners"));
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (data: PartnerFormData) => {
    setFormLoading(true);
    try {
      await api.post("/api/admin/create-partners", data);
      toast.success("Partner created successfully");
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create partner"));
    } finally {
      setFormLoading(false);
    }
  };

  const openToggleModal = (shopId: string, shopName: string, currentStatus: boolean) => {
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

      setRows((prev) =>
        prev.map((row) =>
          row.id === shopId && row.type === "approved"
            ? { ...row, isActive: newStatus }
            : row
        )
      );
      toast.success(`Shop "${shopName}" ${actionVerb}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Failed to ${actionVerb} shop`));
      fetchData();
    } finally {
      setActionInProgress(null);
      setPendingToggle(null);
    }
  };

  const cancelToggle = () => {
    setToggleModalOpen(false);
    setPendingToggle(null);
  };

  const openApprovalModal = (action: "approve" | "reject", storeId: string, storeName: string) => {
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
        setRows((prev) =>
          prev.map((row) =>
            row.id === id
              ? { ...row, type: "approved", shopName: null, isActive: false }
              : row
          )
        );
        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          pending: prev.pending - 1,
        }));
      } else {
        await api.patch(`/api/admin/fabric-stores/${id}/reject`, {
          rejectionNote: rejectNote,
          note: rejectNote,
        });
        toast.success(`Fabric store "${name}" rejected`);
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, type: "rejected" } : row
          )
        );
        setStats((prev) => ({
          ...prev,
          rejected: prev.rejected + 1,
          pending: prev.pending - 1,
        }));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Failed to ${approvalAction} partner`));
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredRows = useMemo(() => {
    let result = rows;
    if (activeTab !== "all") {
      result = rows.filter((r) => r.type === activeTab);
    }
    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.shopName?.toLowerCase().includes(term)
    );
  }, [rows, activeTab, searchTerm]);

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(
      localeParam === "ar" ? "ar-AE" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
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
            onClick={fetchData}
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
        title={pendingToggle?.currentStatus ? "Deactivate Shop" : "Reactivate Shop"}
        message={`Are you sure you want to ${pendingToggle?.currentStatus ? "deactivate" : "reactivate"} "${pendingToggle?.shopName || "this shop"}"?`}
        confirmLabel={pendingToggle?.currentStatus ? "Deactivate" : "Reactivate"}
        cancelLabel="Cancel"
        onConfirm={executeToggle}
        onCancel={cancelToggle}
      />

      <ApprovalModal
        isOpen={approvalModalOpen}
        title={approvalAction === "approve" ? `Approve "${selectedPending?.name || "Fabric Store"}"` : `Reject "${selectedPending?.name || "Fabric Store"}"`}
        message={approvalAction === "approve" ? "This store will be able to set up their shop profile and list fabrics." : "Explain a reason of rejection *"}
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
            onClick={fetchData}
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
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Total</p>
          <p className="text-2xl font-light text-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Approved</p>
          <p className="text-2xl font-light text-black mt-1">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Pending</p>
          <p className="text-2xl font-light text-black mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Rejected</p>
          <p className="text-2xl font-light text-black mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(["all", "approved", "pending", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
          <p className="text-gray-500">No partners found matching the criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => {
                  const isPending = row.type === "pending";
                  const isRejected = row.type === "rejected";
                  const busy = actionInProgress === row.id;

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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}>
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    );
                  }

                  let actions;
                  if (isPending) {
                    actions = (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openApprovalModal("approve", row.id, row.name)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-50 hover:cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openApprovalModal("reject", row.id, row.name)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50 hover:cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    );
                  } else if (isRejected) {
                    actions = <span className="text-xs text-gray-400 italic">No actions</span>;
                  } else {
                    actions = (
                      <button
                        onClick={() => openToggleModal(row.id, row.shopName || "Shop", row.isActive || false)}
                        disabled={busy || !row.shopName}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition disabled:opacity-50 hover:cursor-pointer ${
                          row.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                        } ${!row.shopName ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {busy ? "Toggling..." : row.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    );
                  }

                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-black">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.email}</td>
                      <td className="px-6 py-4 text-sm capitalize">{row.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.shopName || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(row.createdAt)}</td>
                      <td className="px-6 py-4 text-sm">{statusBadge}</td>
                      <td className="px-6 py-4 text-sm">{actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
