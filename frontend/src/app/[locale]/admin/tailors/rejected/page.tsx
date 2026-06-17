"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ---------- Types ----------
interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: "rejected";
  rejectionNote?: string;
}

// ---------- Approval Modal (reuse the same one from AdminTailorsPage) ----------
// We'll copy it here for simplicity; you can also import if shared.
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

export default function RejectedTailorsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [rejected, setRejected] = useState<RejectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Approval modal state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedTailor, setSelectedTailor] = useState<RejectedUser | null>(
    null,
  );

  const fetchRejected = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: RejectedUser[] }>(
        "/api/admin/tailors/rejected-tailors",
      );
      setRejected(res.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load rejected tailors"));
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejected();
  }, []);

  const openApproveModal = (tailor: RejectedUser) => {
    setSelectedTailor(tailor);
    setApprovalModalOpen(true);
  };

  const closeApproveModal = () => {
    setApprovalModalOpen(false);
    setSelectedTailor(null);
  };

  const executeApprove = async () => {
    if (!selectedTailor) return;
    const { _id, name } = selectedTailor;

    setActionInProgress(_id);
    closeApproveModal();

    try {
      await api.patch(`/api/admin/tailors/${_id}/approve`);
      toast.success(`Tailor "${name}" approved successfully`);
      // Remove from list
      setRejected((prev) => prev.filter((t) => t._id !== _id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Approval failed"));
      fetchRejected(); // revert
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-100">
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
            Failed to load rejected tailors
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={fetchRejected}
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
      {/* Approval Modal */}
      <ApprovalModal
        isOpen={approvalModalOpen}
        title={`Approve "${selectedTailor?.name || "Tailor"}"`}
        message="This tailor will be able to create a shop and designs."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={executeApprove}
        onCancel={closeApproveModal}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Rejected Tailors
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and re-approve tailors who were previously rejected.
          </p>
        </div>
        <button
          onClick={fetchRejected}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Total Rejected
        </p>
        <p className="text-2xl font-light text-black mt-1">{rejected.length}</p>
      </div>

      {/* Table */}
      {rejected.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
          <p className="text-gray-500">No rejected tailors found.</p>
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
                    Rejection Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rejected On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rejected.map((tailor) => {
                  const busy = actionInProgress === tailor._id;
                  return (
                    <tr
                      key={tailor._id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        {tailor.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tailor.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {tailor.rejectionNote || "No reason provided"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(tailor.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openApproveModal(tailor)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-50 hover:cursor-pointer"
                        >
                          {busy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {busy ? "Approving..." : "Approve"}
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
    </div>
  );
}
