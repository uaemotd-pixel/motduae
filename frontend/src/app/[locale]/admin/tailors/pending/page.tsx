"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
} from "lucide-react";

// ---------- Reusable Confirmation Modal (Black + White + Off‑white) ----------
interface ConfirmationModalProps {
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

function ConfirmationModal({
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
}: ConfirmationModalProps) {
  // Hooks must be called unconditionally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onCancel();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

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
          {showNote && (
            <div className="mt-4">
              <textarea
                value={noteValue}
                onChange={(e) => onNoteChange?.(e.target.value)}
                placeholder={notePlaceholder}
                rows={3}
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

// ---------- Main Page ----------
interface Tailor {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  phone?: string;
  address?: string;
  approvalStatus: "pending" | "approved" | "rejected";
}

export default function PendingTailorsPage() {
  const params = useParams();
  const localeParams = params.locale as string;

  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [selectedTailor, setSelectedTailor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchPendingTailors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<any>("/api/admin/tailors/pending");
      const raw: any[] = Array.isArray(response) ? response : [];
      const mapped: Tailor[] = raw.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        phone: user.phone || "",
        address: user.address || "",
        approvalStatus: user.approvalStatus,
      }));
      setTailors(mapped);
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Failed to load pending tailors");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTailors();
  }, []);

  const filteredTailors = useMemo(() => {
    if (!searchTerm.trim()) return tailors;
    const term = searchTerm.toLowerCase();
    return tailors.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term),
    );
  }, [tailors, searchTerm]);

  // Open modal for approve or reject
  const openModal = (
    action: "approve" | "reject",
    tailorId: string,
    tailorName: string,
  ) => {
    setModalAction(action);
    setSelectedTailor({ id: tailorId, name: tailorName });
    setRejectNote(""); // reset note
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalAction(null);
    setSelectedTailor(null);
    setRejectNote("");
  };

  const handleConfirm = async () => {
    if (!selectedTailor || !modalAction) return;
    const { id: tailorId, name: tailorName } = selectedTailor;

    setActionInProgress(tailorId);
    closeModal();

    try {
      if (modalAction === "approve") {
        await api.patch(`/api/admin/tailors/${tailorId}/approve`);
        toast.success(`Tailor "${tailorName}" approved successfully`);
        setTailors((prev) => prev.filter((t) => t.id !== tailorId));
      } else {
        // reject
        await api.patch(`/api/admin/tailors/${tailorId}/reject`, {
          rejectionNote: rejectNote,
          note: rejectNote,
        });
        toast.success(`Tailor "${tailorName}" rejected`);
        setTailors((prev) => prev.filter((t) => t.id !== tailorId));
      }
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(
        err,
        modalAction === "approve" ? "Approval failed" : "Rejection failed",
      );
      toast.error(errorMsg);
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(
      localeParams === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-56 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-80 bg-gray-100 rounded mb-8" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-4 border-b border-gray-100 last:border-0"
              >
                <div className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
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
            onClick={fetchPendingTailors}
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
      {/* Custom Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        title={
          modalAction === "approve"
            ? `Approve "${selectedTailor?.name || "Tailor"}"`
            : `Reject "${selectedTailor?.name || "Tailor"}"`
        }
        message={
          modalAction === "approve"
            ? `Are you sure you want to approve this tailor? They will be able to create a shop and designs.`
            : `Are you sure you want to reject this tailor? This action cannot be undone.`
        }
        confirmLabel={modalAction === "approve" ? "Approve" : "Reject"}
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={closeModal}
        showNote={modalAction === "reject"}
        noteValue={rejectNote}
        onNoteChange={setRejectNote}
        notePlaceholder="Optional rejection reason..."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Pending Approvals
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredTailors.length} tailor
            {filteredTailors.length !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          Approve or reject each application
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchPendingTailors}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer"
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
              : "No pending tailors at the moment."}
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
                    Signup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTailors.map((tailor) => {
                  const busy = actionInProgress === tailor.id;
                  return (
                    <tr
                      key={tailor.id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        {tailor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tailor.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(tailor.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tailor.phone || tailor.address ? (
                          <div>
                            {tailor.phone && <div>{tailor.phone}</div>}
                            {tailor.address && (
                              <div className="text-xs text-gray-400">
                                {tailor.address}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              openModal("approve", tailor.id, tailor.name)
                            }
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-50 hover:cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              openModal("reject", tailor.id, tailor.name)
                            }
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition disabled:opacity-50 hover:cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
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
