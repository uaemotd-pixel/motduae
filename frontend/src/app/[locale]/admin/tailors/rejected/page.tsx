"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import toast from "react-hot-toast";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

// ---------- Types ----------
interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: "rejected";
  rejectionNote?: string;
}

export default function RejectedTailorsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [rejected, setRejected] = useState<RejectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString(locale === "ar" ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
        <TableSkeleton rows={5} cols={5} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full px-3 sm:px-0">
        <div className="text-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-lg sm:text-xl text-black">
            Failed to load rejected tailors
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
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
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Rejected Tailors
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Review and re-approve tailors who were previously rejected.
          </p>
        </div>
        <button
          onClick={fetchRejected}
          className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
          Total Rejected
        </p>
        <p className="text-xl sm:text-2xl font-light text-black mt-1">
          {rejected.length}
        </p>
      </div>

      {/* Table */}
      {rejected.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-green-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            No rejected tailors found.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejection Reason
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejected On
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rejected.map((tailor) => {
                    return (
                      <tr
                        key={tailor._id}
                        className="group hover:bg-gray-50 transition-all duration-200"
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-black">
                          {tailor.name}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          {tailor.email}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 max-w-xs truncate">
                          {tailor.rejectionNote || "No reason provided"}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDate(tailor.createdAt)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/tailors/${tailor._id}/application`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-black border border-gray-200 hover:bg-gray-100 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {rejected.map((tailor) => {
              return (
                <div
                  key={tailor._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                          {tailor.name}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">{tailor.email}</span>
                    </div>
                    {tailor.rejectionNote && (
                      <div className="flex items-start gap-1.5 sm:gap-2 text-gray-600">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm wrap-break-word">
                          {tailor.rejectionNote}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="text-xs sm:text-sm">
                        Rejected {formatDate(tailor.createdAt)}
                      </span>
                    </div>
                    <div className="pt-2 sm:pt-3">
                      <Link
                        href={`/admin/tailors/${tailor._id}/application`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-black border border-gray-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
