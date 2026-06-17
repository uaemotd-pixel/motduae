"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import FormField from "@/components/admin/FormField";
import {
  AlertCircle,
  Search,
  RefreshCw,
  Store,
  Edit,
  Trash2,
  Loader2,
  Plus,
} from "lucide-react";

// ---------- Types ----------
interface FabricStorePartner {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  isActive?: boolean;
}

type PartnerFormData = {
  name: string;
  email: string;
  password?: string;
};

// ---------- Modals ----------

// Create/Edit Modal
interface PartnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartnerFormData) => Promise<void>;
  initialData?: FabricStorePartner;
  isEditing?: boolean;
  loading?: boolean;
}

function PartnerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  loading = false,
}: PartnerFormModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setEmail(initialData?.email || "");
      setPassword("");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { name: string; email: string; password?: string } = {
      name,
      email,
    };
    if (!isEditing && password) {
      payload.password = password;
    }
    onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 p-6">
        <h2 className="text-xl font-light text-black tracking-tight">
          {isEditing ? "Edit Partner" : "Add Partner"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/80 transition disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirmation Modal (for deactivate & delete)
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-black">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function AdminPartnersPage() {
  const params = useParams();
  const localeParam = params.locale as string;

  const [rows, setRows] = useState<FabricStorePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Create/Edit modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<
    FabricStorePartner | undefined
  >();
  const [formLoading, setFormLoading] = useState(false);

  // Confirm modal (for deactivate & delete)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "deactivate" | "delete" | null
  >(null);
  const [selectedPartner, setSelectedPartner] =
    useState<FabricStorePartner | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ---------- Fetch ----------
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<FabricStorePartner[]>(
        "/api/admin/partners/fabric-stores",
      );
      setRows(res || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load partners"));
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Handlers ----------
  const handleCreate = async (data: PartnerFormData) => {
    setFormLoading(true);
    try {
      await api.post("/api/admin/create-partners", {
        ...data,
        role: "fabric_store",
        approvalStatus: "approved",
      });
      toast.success("Partner created");
      setFormModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create partner"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (partner: FabricStorePartner) => {
    setEditingPartner(partner);
    setFormModalOpen(true);
  };

  const handleUpdate = async (data: PartnerFormData) => {
    if (!editingPartner) return;
    const { name, email } = data;
    setFormLoading(true);
    try {
      await api.put(`/api/admin/edit-partners/${editingPartner._id}`, {
        name,
        email,
      });
      toast.success("Partner updated");
      setFormModalOpen(false);
      setEditingPartner(undefined);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update partner"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (partner: FabricStorePartner) => {
    setSelectedPartner(partner);
    setConfirmAction("delete");
    setConfirmModalOpen(true);
  };

  const executeConfirm = async () => {
    if (!selectedPartner) return;
    setConfirmLoading(true);
    try {
      if (confirmAction === "deactivate") {
        const currentActive = selectedPartner.isActive ?? true;
        await api.patch(`/api/admin/users/${selectedPartner._id}`, {
          isActive: !currentActive,
        });
        toast.success(`Partner ${currentActive ? "deactivated" : "activated"}`);
      } else if (confirmAction === "delete") {
        await api.delete(`/api/admin/delete-partner/${selectedPartner._id}`);
        toast.success("Partner deleted");
      }
      setConfirmModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Action failed"));
    } finally {
      setConfirmLoading(false);
      setSelectedPartner(null);
      setConfirmAction(null);
    }
  };

  // ---------- Filter ----------
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term),
    );
  }, [rows, searchTerm]);

  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 border border-gray-100"
            >
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
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
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-black/80"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* Modals */}
      <PartnerFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingPartner(undefined);
        }}
        onSubmit={editingPartner ? handleUpdate : handleCreate}
        initialData={editingPartner}
        isEditing={!!editingPartner}
        loading={formLoading}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeConfirm}
        title={
          confirmAction === "deactivate"
            ? selectedPartner?.isActive
              ? "Deactivate Partner"
              : "Activate Partner"
            : "Delete Partner"
        }
        message={
          confirmAction === "deactivate"
            ? `Are you sure you want to ${selectedPartner?.isActive ? "deactivate" : "activate"} "${selectedPartner?.name}"?`
            : `Are you sure you want to permanently delete "${selectedPartner?.name}"? This action cannot be undone.`
        }
        confirmLabel={
          confirmAction === "deactivate"
            ? selectedPartner?.isActive
              ? "Deactivate"
              : "Activate"
            : "Delete"
        }
        loading={confirmLoading}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black">
            Fabric Store Partners
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage fabric store partner accounts (fabric_store role only)
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
            onClick={() => {
              setEditingPartner(undefined);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition text-sm hover:cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Partner
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Total Partners</p>
          <p className="text-2xl font-light text-black mt-1">{rows.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Pending</p>
          <p className="text-2xl font-light text-black mt-1">
            {rows.filter((r) => r.approvalStatus === "pending").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Approved</p>
          <p className="text-2xl font-light text-black mt-1">
            {rows.filter((r) => r.approvalStatus === "approved").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase">Rejected</p>
          <p className="text-2xl font-light text-black mt-1">
            {rows.filter((r) => r.approvalStatus === "rejected").length}
          </p>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        {/* Removed duplicate Refresh button, already in header */}
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No fabric store partners found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row) => {
                  const status = row.approvalStatus || "pending";
                  const statusColor =
                    status === "approved"
                      ? "bg-green-100 text-green-800"
                      : status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800";
                  const isActive =
                    row.isActive !== undefined ? row.isActive : true;

                  return (
                    <tr key={row._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-black">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {!isActive && (
                          <span className="ml-2 text-xs text-gray-400">
                            (inactive)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(row)}
                            className="text-gray-500 hover:text-black transition p-1 hover:cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="text-gray-500 hover:text-red-600 transition p-1 hover:cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
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
