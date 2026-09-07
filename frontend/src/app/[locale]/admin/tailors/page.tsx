"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MoreVertical,
  Image as ImageIcon,
  Mail,
  Calendar,
  User,
  Eye,
} from "lucide-react";
import { ImageModal } from "@/components/shared/ImageModal";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

// ---------- Types ----------

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
    requestNumber?: string;
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
  requestNumber?: string;
}

interface RejectedUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  approvalStatus: "rejected";
  profilePic?: string;
  requestNumber?: string;
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
  requestNumber?: string;
};

function tailorApplicationHref(row: {
  id: string;
  ownerId?: { _id: string } | null;
}) {
  const userId = row.ownerId?._id || row.id;
  return `/admin/tailors/${userId}/application`;
}

export default function AdminTailorsPage() {
  const params = useParams();
  const localeParam = params.locale as string;

  const [rows, setRows] = useState<TailorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

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

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  // 3-dot menu state
  const [menuItem, setMenuItem] = useState<TailorRow | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // pop up image function
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  // ---------- 3-dot menu ----------
  const closeMenu = () => {
    setMenuPosition(null);
    setMenuItem(null);
    setMenuAnchor(null);
  };

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    row: TailorRow,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuItem(row);
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }
    if (menuPosition) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuPosition]);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }
    if (menuPosition) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        requestNumber: shop.ownerId?.requestNumber || "",
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
          requestNumber: user.requestNumber || "",
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
        requestNumber: user.requestNumber || "",
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
        requestNumber: user.requestNumber || "",
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

  // ---------- Filter & formatting ----------
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) => {
      const name = row.name?.toLowerCase() || "";
      const email = row.email?.toLowerCase() || "";
      const shop = row.shopName?.toLowerCase() || "";
      const requestNumber = row.requestNumber?.toLowerCase() || "";
      return (
        name.includes(term) ||
        email.includes(term) ||
        shop.includes(term) ||
        requestNumber.includes(term)
      );
    });
  }, [rows, searchTerm]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return filteredRows.slice(startIndex, startIndex + limit);
  }, [filteredRows, currentPage, limit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString(localeParam === "ar" ? "ar-AE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAvatar = (row: TailorRow) => {
    const imageUrl = row.logo || row.profilePic;
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={row.name}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover hover:cursor-pointer shrink-0"
          onClick={() => handleImageClick(imageUrl)}
        />
      );
    }
    return (
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
      </div>
    );
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <TableSkeleton rows={5} cols={6} className="rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full px-3 sm:px-0">
        <div className="text-center bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-lg sm:text-xl text-black">
            Failed to load tailors
          </p>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">{error}</p>
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
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Modals */}
      <ConfirmationModal
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
        isDanger={!!pendingToggle?.currentStatus}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Tailors
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage all tailors – pending approvals and active shops.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Total
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {stats.total}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Approved
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {stats.approved}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Pending
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {stats.pending}
          </p>
        </div>
        <Link
          href={`/admin/tailors/rejected`}
          className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
        >
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Rejected
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {stats.rejected}
          </p>
        </Link>
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, shop name, or request number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
          />
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      {totalItems === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm ? "No tailors match your search." : "No tailors found."}
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
                      Shop
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
                  {paginatedRows.map((row) => {
                    const isPending = row.type === "pending";
                    const isRejected = row.type === "rejected";
                    const busy = actionInProgress === row.id;

                    let statusBadge;
                    if (isPending) {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      );
                    } else if (isRejected) {
                      statusBadge = (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                            row.isActive
                              ? "bg-white text-black border border-black/30"
                              : "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      );
                    }

                    const actions = (
                      <button
                        onClick={(e) => handleMenuOpen(e, row)}
                        disabled={busy}
                        className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer disabled:opacity-50"
                        title="Actions"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    );

                    return (
                      <tr
                        key={row.id}
                        className="group hover:bg-gray-50 transition-all duration-200"
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getAvatar(row)}
                            <span className="text-xs sm:text-sm font-medium text-black">
                              {row.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                          <div>{row.email}</div>
                          {row.requestNumber ? (
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">
                              {row.requestNumber}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
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
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          {actions}
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
            {paginatedRows.map((row) => {
              const isPending = row.type === "pending";
              const isRejected = row.type === "rejected";
              const busy = actionInProgress === row.id;

              let statusBadge;
              if (isPending) {
                statusBadge = (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </span>
                );
              } else if (isRejected) {
                statusBadge = (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                    Rejected
                  </span>
                );
              } else {
                statusBadge = (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      row.isActive
                        ? "bg-white text-black border border-black/30"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {row.isActive ? "Active" : "Inactive"}
                  </span>
                );
              }

              const actions = (
                <button
                  onClick={(e) => handleMenuOpen(e, row)}
                  disabled={busy}
                  className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer disabled:opacity-50 shrink-0"
                  title="Actions"
                >
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              );

              return (
                <div
                  key={row.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {getAvatar(row)}
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                          {row.name || "—"}
                        </h3>
                        <div className="mt-1">{statusBadge}</div>
                      </div>
                    </div>
                    {actions}
                  </div>

                  <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">{row.email}</span>
                    </div>
                    {row.requestNumber ? (
                      <div className="text-[10px] uppercase tracking-wider text-gray-400">
                        {row.requestNumber}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 min-w-0">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">
                        {isPending
                          ? row.address || "—"
                          : isRejected
                            ? "—"
                            : row.shopName || "No shop yet"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                      <span className="text-xs sm:text-sm">
                        Joined {formatDate(row.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {totalItems > 0 && (
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
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <Link
                href={tailorApplicationHref(menuItem)}
                onClick={closeMenu}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>View</span>
              </Link>
              {menuItem.type === "approved" && (
                <button
                  onClick={() => {
                    closeMenu();
                    if (menuItem.shopName) {
                      openToggleModal(
                        menuItem.id,
                        menuItem.shopName || "Shop",
                        menuItem.isActive || false,
                      );
                    }
                  }}
                  disabled={!menuItem.shopName}
                  className={`w-full flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm transition-colors text-left hover:cursor-pointer whitespace-nowrap ${
                    menuItem.isActive
                      ? "text-red-600 hover:bg-red-100"
                      : "text-green-700 hover:bg-green-100"
                  } ${!menuItem.shopName ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {menuItem.isActive ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>Reactivate</span>
                    </>
                  )}
                </button>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Tailors image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
