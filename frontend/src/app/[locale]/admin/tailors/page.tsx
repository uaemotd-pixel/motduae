"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { Users, AlertCircle, Search, RefreshCw } from "lucide-react";

// --- Reusable Modal Component ---
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // All hooks must be called unconditionally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onCancel();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  // Now it’s safe to return early
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-200"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-100 overflow-hidden">
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

// Types for approved tailors (shop-centric)
interface ApprovedTailor {
  _id: string; // shop ID
  name: string; // shop name
  isActive: boolean;
  ownerId: {
    _id: string;
    name: string;
    email: string;
    approvalStatus: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  total: number;
  items: ApprovedTailor[];
}

export default function AdminTailorsPage() {
  const params = useParams();
  const localeParam = params.locale as string;

  const [tailors, setTailors] = useState<ApprovedTailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    shopId: string;
    shopName: string;
    currentStatus: boolean;
  } | null>(null);

  useEffect(() => {
    fetchTailors();
    fetchStats();
  }, []);

  const fetchTailors = async () => {
    try {
      setLoading(true);
      const data = await api.get<ApiResponse>("/api/admin/tailors");
      setTailors(data.items || []);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load approved tailors"));
      toast.error("Failed to load approved tailors");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const pendingData = await api.get<any>("/api/admin/tailors/pending");
      const pendingCount = Array.isArray(pendingData) ? pendingData.length : 0;
      let rejectedCount = 0;
      try {
        const rejectedData = await api.get<any>("/api/admin/tailors/rejected");
        rejectedCount = Array.isArray(rejectedData) ? rejectedData.length : 0;
      } catch (err) {
        console.error("Failed to fetch rejected count", err);
      }
      setStats((prev) => ({
        ...prev,
        pending: pendingCount,
        rejected: rejectedCount,
      }));
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    if (!loading) {
      setStats((prev) => ({
        ...prev,
        approved: tailors.length,
        total: tailors.length + prev.pending + prev.rejected,
      }));
    }
  }, [loading, tailors.length]);

  // Open modal to confirm toggle
  const confirmToggle = (
    shopId: string,
    shopName: string,
    currentStatus: boolean,
  ) => {
    setPendingAction({ shopId, shopName, currentStatus });
    setModalOpen(true);
  };

  // Execute the toggle after confirmation
  const executeToggle = async () => {
    if (!pendingAction) return;
    const { shopId, shopName, currentStatus } = pendingAction;
    const action = currentStatus ? "deactivate" : "reactivate";
    const actionVerb = currentStatus ? "deactivated" : "reactivated";

    setTogglingId(shopId);
    setModalOpen(false);
    try {
      await api.patch(`/api/admin/tailors/${shopId}/deactivate`);
      // Optimistic update
      setTailors((prev) =>
        prev.map((shop) =>
          shop._id === shopId ? { ...shop, isActive: !currentStatus } : shop,
        ),
      );
      toast.success(`Shop "${shopName}" successfully ${actionVerb}`);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, `Failed to ${action} shop`);
      toast.error(message);
      // Revert optimistic update by re-fetching
      fetchTailors();
    } finally {
      setTogglingId(null);
      setPendingAction(null);
    }
  };

  const cancelToggle = () => {
    setModalOpen(false);
    setPendingAction(null);
  };

  const filteredTailors = useMemo(() => {
    if (!searchTerm) return tailors;
    const term = searchTerm.toLowerCase();
    return tailors.filter((tailor) => {
      const shopName = tailor.name?.toLowerCase() || "";
      const ownerName = tailor.ownerId?.name?.toLowerCase() || "";
      const email = tailor.ownerId?.email?.toLowerCase() || "";
      return (
        shopName.includes(term) ||
        ownerName.includes(term) ||
        email.includes(term)
      );
    });
  }, [tailors, searchTerm]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
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
                <div className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
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
            Failed to load approved tailors
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={fetchTailors}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        title={
          pendingAction?.currentStatus ? "Deactivate Shop" : "Reactivate Shop"
        }
        message={`Are you sure you want to ${
          pendingAction?.currentStatus ? "deactivate" : "reactivate"
        } "${pendingAction?.shopName || "this shop"}"?`}
        confirmLabel={
          pendingAction?.currentStatus ? "Deactivate" : "Reactivate"
        }
        cancelLabel="Cancel"
        confirmVariant={pendingAction?.currentStatus ? "danger" : "success"}
        onConfirm={executeToggle}
        onCancel={cancelToggle}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Approved Tailors
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage shop visibility – deactivate to hide from public catalog.
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
        <Link
          href={`/admin/tailors/pending`}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Pending
          </p>
          <p className="text-2xl font-light text-black mt-1">{stats.pending}</p>
        </Link>
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
            placeholder="Search by shop name, tailor name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchTailors}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {filteredTailors.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {searchTerm
              ? "No tailors match your search."
              : "No approved tailors found."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tailor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTailors.map((shop) => (
                  <tr
                    key={shop._id}
                    className="group hover:bg-gray-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                      {shop.ownerId?.name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {shop.ownerId?.email || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {shop.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(shop.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          shop.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {shop.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <button
                        onClick={() =>
                          confirmToggle(shop._id, shop.name, shop.isActive)
                        }
                        disabled={togglingId === shop._id}
                        className={`px-3 py-1 rounded text-white text-xs font-medium hover:cursor-pointer ${
                          shop.isActive
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        } disabled:opacity-50`}
                      >
                        {togglingId === shop._id
                          ? "..."
                          : shop.isActive
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
