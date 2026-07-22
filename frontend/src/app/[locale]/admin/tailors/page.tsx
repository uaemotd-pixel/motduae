"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";
import {
  Users,
  AlertCircle,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

// ---------- Modal for Deactivate/Reactivate ----------
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

// ---------- Modal for Approve/Reject (with optional note) ----------
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
  onNoteChange?: (value: string) => void;
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
  notePlaceholder = "Optional reason...",
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100">
        <div className="p-6">
          <h3 className="text-lg font-medium text-black">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          {showNote && (
            <div className="mt-4">
              <textarea
                value={noteValue}
                onChange={(e) => onNoteChange?.(e.target.value)}
                placeholder={notePlaceholder}
                rows={3}
                required
                className="w-full px-3 py-2 text-sm text-black bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-black transition resize-none"
              />
            </div>
          )}
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

// ---------- Types ----------
interface ApprovedTailor {
  _id: string;
  name: string;
  isActive: boolean;
  logo?: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
    approvalStatus: string;
    profilePic?: string;
  };
  createdAt: string;
}

interface ApprovedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: "approved";
  profilePic?: string;
}

interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: "rejected";
  profilePic?: string;
}

type TailorRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  type: "pending" | "approved" | "rejected";
  shopName?: string | null;
  isActive?: boolean;
  phone?: string;
  address?: string;
  ownerId?: ApprovedTailor["ownerId"];
  logo?: string;
  profilePic?: string;
};

export default function AdminTailorsPage() {
  const [rows, setRows] = useState<TailorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

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

  // ---------- Data fetching ----------
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Approved shops
      const approvedShopsRes = await api.get<{ items: ApprovedTailor[] }>(
        "/api/admin/tailors",
      );
      const approvedShops = approvedShopsRes.items || [];

      // 2. Approved users without shops
      const approvedUsersRes = await api.get<{ items: ApprovedUser[] }>(
        "/api/admin/tailors/approved-users",
      );
      const approvedUsers = approvedUsersRes.items || [];

      // 3. Pending tailors
      const pendingRes = await api.get<any[]>("/api/admin/tailors/pending");
      const pending = Array.isArray(pendingRes) ? pendingRes : [];

      // 4. Rejected users
      const rejectedRes = await api.get<{ items: RejectedUser[] }>(
        "/api/admin/tailors/rejected-tailors",
      );
      const rejectedUsers = rejectedRes.items || [];

      const shopOwnerIds = new Set(
        approvedShops.map((shop) => shop.ownerId?._id).filter(Boolean),
      );

      const shopRows: TailorRow[] = approvedShops.map((shop) => ({
        id: shop._id,
        name: shop.ownerId?.name || "—",
        email: shop.ownerId?.email || "—",
        createdAt: shop.createdAt,
        type: "approved",
        shopName: shop.name,
        isActive: shop.isActive,
        ownerId: shop.ownerId,
        logo: shop.logo || shop.ownerId?.profilePic,
        profilePic: shop.ownerId?.profilePic,
      }));

      const approvedUserRows: TailorRow[] = approvedUsers
        .filter((user) => !shopOwnerIds.has(user._id))
        .map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          type: "approved",
          shopName: null,
          isActive: false,
          profilePic: user.profilePic,
        }));

      const pendingRows: TailorRow[] = pending.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        type: "pending",
        phone: user.phone || "",
        address: user.address || "",
        profilePic: user.profilePic,
      }));

      const rejectedRows: TailorRow[] = rejectedUsers.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        type: "rejected",
        shopName: null,
        isActive: false,
        profilePic: user.profilePic,
      }));

      const combined = [
        ...shopRows,
        ...approvedUserRows,
        ...pendingRows,
        ...rejectedRows,
      ];

      // Preserve any local rejected rows not yet fetched (optimistic updates)
      setRows((prevRows) => {
        const existingRejected = prevRows.filter((r) => r.type === "rejected");
        const rejectedToKeep = existingRejected.filter(
          (r) => !combined.some((c) => c.id === r.id),
        );
        return [...combined, ...rejectedToKeep];
      });

      const approvedCount =
        approvedShops.length +
        approvedUsers.filter((u) => !shopOwnerIds.has(u._id)).length;
      setStats({
        total: approvedCount + pending.length + rejectedUsers.length,
        approved: approvedCount,
        pending: pending.length,
        rejected: rejectedUsers.length,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load tailors"));
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Handlers ----------
  const openToggleModal = (
    shopId: string,
    shopName: string,
    currentStatus: boolean,
  ) => {
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
      await api.patch(`/api/admin/tailors/${shopId}/deactivate`, {
        isActive: newStatus,
      });

      setRows((prev) =>
        prev.map((row) =>
          row.id === shopId && row.type === "approved"
            ? { ...row, isActive: newStatus }
            : row,
        ),
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

  const openApprovalModal = (
    action: "approve" | "reject",
    tailorId: string,
    tailorName: string,
  ) => {
    setApprovalAction(action);
    setSelectedPending({ id: tailorId, name: tailorName });
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
        await api.patch(`/api/admin/tailors/${id}/approve`);
        toast.success(`Tailor "${name}" approved`);
        setRows((prev) =>
          prev.map((row) =>
            row.id === id
              ? { ...row, type: "approved", shopName: null, isActive: false }
              : row,
          ),
        );
        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          pending: prev.pending - 1,
        }));
      } else {
        await api.patch(`/api/admin/tailors/${id}/reject`, {
          rejectionNote: rejectNote,
          note: rejectNote,
        });
        toast.success(`Tailor "${name}" rejected`);
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, type: "rejected" } : row,
          ),
        );
        setStats((prev) => ({
          ...prev,
          rejected: prev.rejected + 1,
          pending: prev.pending - 1,
        }));
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          approvalAction === "approve" ? "Approval failed" : "Rejection failed",
        ),
      );
      fetchData();
    } finally {
      setActionInProgress(null);
    }
  };

  // ---------- Filter & formatting ----------
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) => {
      const name = row.name?.toLowerCase() || "";
      const email = row.email?.toLowerCase() || "";
      const shop = row.shopName?.toLowerCase() || "";
      return name.includes(term) || email.includes(term) || shop.includes(term);
    });
  }, [rows, searchTerm]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getAvatar = (row: TailorRow) => {
    const imageUrl = row.logo || row.profilePic;
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={row.name}
          className="w-9 h-9 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
        <Users className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-7 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-100">
                <div className="grid grid-cols-7 gap-4">
                  {[...Array(7)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded" />
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
            Failed to load tailors
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
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

  // ---------- Main Render ----------
  return (
    <div className="space-y-6">
      {/* Modals */}
      <ToggleModal
        isOpen={toggleModalOpen}
        title={
          pendingToggle?.currentStatus ? "Deactivate Shop" : "Reactivate Shop"
        }
        message={`Are you sure you want to ${
          pendingToggle?.currentStatus ? "deactivate" : "reactivate"
        } "${pendingToggle?.shopName || "this shop"}"?`}
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
            ? `Approve "${selectedPending?.name || "Tailor"}"`
            : `Reject "${selectedPending?.name || "Tailor"}"`
        }
        message={
          approvalAction === "approve"
            ? "This tailor will be able to create a shop and designs."
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Tailors
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage all tailors – pending approvals and active shops.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Total
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Approved
          </p>
          <p className="text-2xl font-light text-black mt-1">
            {stats.approved}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Pending
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.pending}</p>
        </div>
        <Link
          href={`/admin/tailors/rejected`}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Rejected
          </p>
          <p className="text-2xl font-light text-black mt-1">
            {stats.rejected}
          </p>
        </Link>
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or shop name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm ? "No tailors match your search." : "No tailors found."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row) => {
                  const isPending = row.type === "pending";
                  const isRejected = row.type === "rejected";
                  const busy = actionInProgress === row.id;

                  let statusBadge;
                  if (isPending) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.isActive
                            ? "bg-black text-white"
                            : "bg-gray-200 text-black"
                        }`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    );
                  }

                  let actions;
                  if (isPending) {
                    actions = (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openApprovalModal("approve", row.id, row.name)
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-50 hover:cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            openApprovalModal("reject", row.id, row.name)
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50 hover:cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    );
                  } else if (isRejected) {
                    actions = (
                      <span className="text-xs text-gray-400 italic">
                        No actions
                      </span>
                    );
                  } else {
                    actions = (
                      <button
                        onClick={() =>
                          openToggleModal(
                            row.id,
                            row.shopName || "Shop",
                            row.isActive || false,
                          )
                        }
                        disabled={busy || !row.shopName}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition disabled:opacity-50 hover:cursor-pointer ${
                          row.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        } ${!row.shopName ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {busy ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Toggling...
                          </>
                        ) : row.isActive ? (
                          "Deactivate"
                        ) : (
                          "Reactivate"
                        )}
                      </button>
                    );
                  }

                  return (
                    <tr
                      key={row.id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getAvatar(row)}
                          <span className="text-sm font-medium text-black">
                            {row.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPending
                              ? "bg-yellow-100 text-yellow-800"
                              : isRejected
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {isPending
                            ? "Pending"
                            : isRejected
                              ? "Rejected"
                              : "Approved"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isPending ? (
                          <div>
                            {row.address && (
                              <div className="text-xs text-gray-400">
                                {row.address}
                              </div>
                            )}
                            {!row.address && "—"}
                          </div>
                        ) : isRejected ? (
                          "—"
                        ) : (
                          row.shopName || "No shop yet"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{actions}</td>
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
