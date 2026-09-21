"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
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

type TailorTab = "all" | "approved" | "pending" | "rejected";
type ApprovedStatusTab = "all" | "active" | "inactive";

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

function AdminTailorsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const localeParam = (params?.locale as string) || "en";

  const urlTab = searchParams.get("tab") || searchParams.get("status");
  const highlightId =
    searchParams.get("highlight") ||
    searchParams.get("id") ||
    searchParams.get("tailorId") ||
    "";

  const initialTab: TailorTab =
    urlTab === "pending" ||
    urlTab === "approved" ||
    urlTab === "rejected" ||
    urlTab === "all"
      ? urlTab
      : highlightId
        ? "pending"
        : "all";

  const [rows, setRows] = useState<TailorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TailorTab>(initialTab);
  const [approvedStatusTab, setApprovedStatusTab] =
    useState<ApprovedStatusTab>("all");
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

  // Sync tab with URL if changed
  useEffect(() => {
    if (
      urlTab &&
      (urlTab === "pending" ||
        urlTab === "approved" ||
        urlTab === "rejected" ||
        urlTab === "all")
    ) {
      setActiveTab(urlTab);
      setCurrentPage(1);
    }
  }, [urlTab]);

  // If highlightId is present and target tailor is found, ensure activeTab matches
  useEffect(() => {
    if (!highlightId || rows.length === 0) return;
    const target = rows.find(
      (r) => r.id === highlightId || r.ownerId?._id === highlightId,
    );
    if (target && !urlTab) {
      setActiveTab(target.type);
    }
  }, [highlightId, rows, urlTab]);

  const highlightedTailor = useMemo(() => {
    if (!highlightId || rows.length === 0) return null;
    return (
      rows.find(
        (r) => r.id === highlightId || r.ownerId?._id === highlightId,
      ) || null
    );
  }, [highlightId, rows]);

  // Smooth scroll to highlighted tailor when loaded
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (!highlightId || loading || hasScrolledRef.current) return;
    const el =
      document.getElementById(`tailor-${highlightId}`) ||
      document.getElementById(`tailor-card-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolledRef.current = true;
    }
  }, [highlightId, loading, rows]);

  // ---------- Filter & formatting ----------
  const filteredRows = useMemo(() => {
    const byTab =
      activeTab === "all"
        ? rows
        : rows.filter((row) => row.type === activeTab);

    const byStatus =
      activeTab === "approved" && approvedStatusTab !== "all"
        ? byTab.filter((row) =>
            approvedStatusTab === "active" ? Boolean(row.isActive) : !row.isActive,
          )
        : byTab;

    let result = byStatus;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = byStatus.filter((row) => {
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
    }

    // Place the highlighted tailor at the very top of the list
    if (highlightId) {
      const matchIndex = result.findIndex(
        (r) => r.id === highlightId || r.ownerId?._id === highlightId,
      );
      if (matchIndex > -1) {
        const matched = result[matchIndex];
        result = [matched, ...result.filter((_, idx) => idx !== matchIndex)];
      }
    }

    return result;
  }, [rows, searchTerm, activeTab, approvedStatusTab, highlightId]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return filteredRows.slice(startIndex, startIndex + limit);
  }, [filteredRows, currentPage, limit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, approvedStatusTab]);

  const handleTabChange = (tab: TailorTab) => {
    setActiveTab(tab);
    if (tab !== "approved") {
      setApprovedStatusTab("all");
    }
    setCurrentPage(1);
  };

  const handleApprovedStatusChange = (tab: ApprovedStatusTab) => {
    setApprovedStatusTab(tab);
    setCurrentPage(1);
  };

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
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Tailors
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage all tailors – pending approvals and active shops.
          </p>
        </div>
      </div>

      {/* Action Required Banner for Notification Deep Link */}
      {highlightedTailor && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-amber-950">
                  {localeParam === "ar"
                    ? "مطلوب اتخاذ إجراء: مراجعة طلب الخياط"
                    : "Action Required: Review Tailor Registration"}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-900 border border-amber-300">
                  {localeParam === "ar" ? "جديد" : "New"}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {localeParam === "ar"
                  ? `قام الخياط (${highlightedTailor.name || highlightedTailor.email}) بالتسجيل ويتطلب مراجعة الطلب للاعتماد أو الرفض.`
                  : `Newly registered tailor (${highlightedTailor.name || highlightedTailor.email}) is awaiting your review to approve or reject.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={tailorApplicationHref(highlightedTailor)}
              className="px-4 py-2 bg-black text-white text-xs font-medium rounded-xl hover:bg-black/85 transition inline-flex items-center gap-2 shadow-sm hover:cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{localeParam === "ar" ? "مراجعة الطلب الآن" : "Review Application Now"}</span>
            </Link>
          </div>
        </div>
      )}

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
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
            Rejected
          </p>
          <p className="text-xl sm:text-2xl font-light text-black mt-1">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex w-full sm:w-auto gap-0.5 sm:gap-2 border-b border-gray-200">
          {(["all", "approved", "pending", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 sm:flex-none px-1.5 sm:px-3 md:px-4 py-2 text-[10px] sm:text-xs md:text-sm font-medium transition-colors hover:cursor-pointer capitalize text-center ${
                activeTab === tab
                  ? "border-b-2 border-black text-black"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, shop name, or request number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {activeTab === "approved" && (
        <div className="flex w-full sm:w-auto gap-0.5 sm:gap-2 border-b border-gray-200">
          {(["all", "active", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleApprovedStatusChange(tab)}
              className={`flex-1 sm:flex-none px-1.5 sm:px-3 md:px-4 py-2 text-[10px] sm:text-xs md:text-sm font-medium transition-colors hover:cursor-pointer capitalize text-center ${
                approvedStatusTab === tab
                  ? "border-b-2 border-black text-black"
                  : "text-gray-500 hover:text-black"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {totalItems === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm
              ? "No tailors match your search."
              : "No tailors found matching the criteria."}
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
                    const isHighlighted = Boolean(
                      highlightId &&
                        (row.id === highlightId || row.ownerId?._id === highlightId),
                    );

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
                      <div className="flex items-center justify-end gap-2">
                        {isHighlighted && (
                          <Link
                            href={tailorApplicationHref(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-black/85 transition shadow-sm hover:cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{localeParam === "ar" ? "مراجعة الطلب" : "Review Application"}</span>
                          </Link>
                        )}
                        <button
                          onClick={(e) => handleMenuOpen(e, row)}
                          disabled={busy}
                          className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer disabled:opacity-50"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    );

                    return (
                      <tr
                        key={row.id}
                        id={`tailor-${row.id}`}
                        className={`group transition-all duration-200 ${
                          isHighlighted
                            ? "bg-amber-50/70 hover:bg-amber-100/50 border-l-4 border-l-amber-500 ring-1 ring-amber-200 shadow-xs"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getAvatar(row)}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-medium text-black">
                                  {row.name || "—"}
                                </span>
                                {isHighlighted && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/90 text-amber-900 border border-amber-300">
                                    <AlertCircle className="w-3 h-3 text-amber-700 animate-pulse" />
                                    {localeParam === "ar" ? "مطلوب اتخاذ إجراء" : "Action Required"}
                                  </span>
                                )}
                              </div>
                              {isHighlighted && (
                                <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                                  {localeParam === "ar"
                                    ? "طلب تسجيل خياط جديد بانتظار المراجعة"
                                    : "Newly registered tailor awaiting review"}
                                </p>
                              )}
                            </div>
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

              const isHighlighted = Boolean(
                highlightId &&
                  (row.id === highlightId || row.ownerId?._id === highlightId),
              );

              return (
                <div
                  key={row.id}
                  id={`tailor-card-${row.id}`}
                  className={`bg-white rounded-2xl shadow-sm border p-3 sm:p-4 transition-all duration-200 ${
                    isHighlighted
                      ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-300/60 shadow-md"
                      : "border-gray-100"
                  }`}
                >
                  {isHighlighted && (
                    <div className="mb-3 px-3 py-1.5 bg-amber-100/90 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                      <span>
                        {localeParam === "ar"
                          ? "مطلوب اتخاذ إجراء: مراجعة طلب الخياط"
                          : "Action Required: Review Tailor Application"}
                      </span>
                    </div>
                  )}

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

                  {isHighlighted && (
                    <Link
                      href={tailorApplicationHref(row)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2 bg-black text-white text-xs font-medium rounded-xl hover:bg-black/85 transition shadow-sm hover:cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{localeParam === "ar" ? "مراجعة الطلب الآن" : "Review Application Now"}</span>
                    </Link>
                  )}
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

export default function AdminTailorsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <AdminTailorsContent />
    </Suspense>
  );
}
