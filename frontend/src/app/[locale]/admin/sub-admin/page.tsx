"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, getApiErrorMessage } from "@/lib/api/client";
import {
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Users,
  Mail,
  Calendar,
  Shield,
  MoreVertical,
  Power,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  perms: Record<string, boolean>;
  isActive?: boolean;
  createdAt: string;
}

interface ApiResponse {
  items: SubAdmin[];
  total: number;
  page: number;
  totalPages: number;
}

type ModalAction = "delete" | "toggle";

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isSubActive(sub: SubAdmin) {
  return sub.isActive !== false;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
        isActive
          ? "bg-white text-black border border-black/30"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function PermissionBadges({
  perms,
  compact = false,
}: {
  perms?: Record<string, boolean>;
  compact?: boolean;
}) {
  const allowed = Object.entries(perms || {}).filter(([, v]) => v);
  if (allowed.length === 0) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {allowed.map(([perm]) => (
        <span
          key={perm}
          className={`inline-flex items-center rounded-full font-medium bg-white border border-black/30 text-black ${
            compact
              ? "px-1.5 py-0.5 text-[10px]"
              : "px-2 py-0.5 text-[10px] sm:text-xs"
          }`}
        >
          {perm}
        </span>
      ))}
    </div>
  );
}

export default function SubAdminPage() {
  const [subs, setSubs] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    action: ModalAction;
    sub: SubAdmin | null;
  }>({ action: "delete", sub: null });

  const [menuItem, setMenuItem] = useState<SubAdmin | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const closeMenu = () => {
    setMenuPosition(null);
    setMenuItem(null);
    setMenuAnchor(null);
  };

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
  }, [menuPosition]);

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
  }, [menuPosition]);

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

  useEffect(() => {
    fetchSubs(1);
  }, []);

  const fetchSubs = useCallback(
    async (page = 1, limitOverride?: number) => {
      try {
        setLoading(true);
        const l = limitOverride || limit;
        const search = searchTerm
          ? `&search=${encodeURIComponent(searchTerm)}`
          : "";
        const res = await api.get<ApiResponse>(
          `/api/subadmins?page=${page}&limit=${l}${search}`,
        );
        setSubs(res.items || []);
        setTotalItems(res.total || 0);
        setCurrentPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
      } catch (err: any) {
        setSubs([]);
        setTotalItems(0);
        setTotalPages(1);
        console.error("Failed to fetch sub‑admins:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, limit],
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchSubs(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const openModal = (action: ModalAction, sub: SubAdmin) => {
    closeMenu();
    setModalConfig({ action, sub });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalConfig({ action: "delete", sub: null });
  };

  const handleConfirm = async () => {
    const { action, sub } = modalConfig;
    if (!sub) return;
    const id = sub._id;
    const name = sub.name;

    setActionLoading(id);
    try {
      if (action === "delete") {
        await api.delete(`/api/subadmins/${id}`);
        toast.success(`"${name}" deleted successfully`);
      } else {
        const res = await api.patch<{ isActive: boolean }>(
          `/api/subadmins/${id}/toggle-active`,
        );
        toast.success(
          `Sub-admin ${res.isActive ? "activated" : "deactivated"} successfully`,
        );
      }
      closeModal();
      void fetchSubs(currentPage);
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          `Failed to ${action === "delete" ? "delete" : "change status"}`,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMenuOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    sub: SubAdmin,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAnchor(e.currentTarget);
    setMenuPosition({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setMenuItem(sub);
  };

  const handlePageChange = (page: number) => {
    fetchSubs(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    fetchSubs(1, newLimit);
  };

  const filteredSubs = useMemo(() => {
    return subs;
  }, [subs]);

  const modalSub = modalConfig.sub;
  const modalSubActive = modalSub ? isSubActive(modalSub) : true;

  if (loading && subs.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
        <div className="flex justify-between items-center gap-3">
          <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <TableSkeleton rows={5} cols={4} className="rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      <ConfirmationModal
        isOpen={modalOpen}
        title={
          modalConfig.action === "delete"
            ? "Delete Sub-Admin"
            : modalSubActive
              ? "Deactivate Sub-Admin"
              : "Activate Sub-Admin"
        }
        message={
          modalConfig.action === "delete"
            ? `Are you sure you want to delete "${modalSub?.name}"? This action cannot be undone.`
            : modalSubActive
              ? `Are you sure you want to deactivate "${modalSub?.name}"? They will lose access.`
              : `Are you sure you want to activate "${modalSub?.name}"?`
        }
        confirmLabel={
          modalConfig.action === "delete"
            ? "Delete"
            : modalSubActive
              ? "Deactivate"
              : "Activate"
        }
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={closeModal}
        isLoading={actionLoading === modalSub?._id}
        isDanger={modalConfig.action === "delete" || modalSubActive}
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
              className="w-fit min-w-30 sm:min-w-35 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:cursor-pointer"
            >
              <Link
                href={`/admin/sub-admin/${menuItem._id}/edit`}
                onClick={closeMenu}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Edit</span>
              </Link>
              <button
                type="button"
                onClick={() => openModal("toggle", menuItem)}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>
                  {isSubActive(menuItem) ? "Deactivate" : "Activate"}
                </span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => openModal("delete", menuItem)}
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors text-left hover:cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Delete</span>
              </button>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-light text-black tracking-tight">
            Sub‑Admins
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage sub‑administrators and their permissions
          </p>
        </div>
        <Link href="/admin/sub-admin/new">
          <button className="inline-flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition text-xs sm:text-sm hover:cursor-pointer">
            Create Sub Admin
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end">
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={() => fetchSubs(currentPage)}
            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-gray-600 hover:text-black transition text-xs sm:text-sm border border-gray-200 rounded-lg bg-white hover:cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* List */}
      {filteredSubs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
          {searchTerm ? (
            <>
              <p className="text-gray-500 text-sm sm:text-base">
                No results found for &quot;{searchTerm}&quot;
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition hover:cursor-pointer"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm sm:text-base">
                No sub‑admins yet
              </p>
              <Link href="/admin/sub-admin/new">
                <button className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm hover:cursor-pointer">
                  Create First Sub Admin
                </button>
              </Link>
            </>
          )}
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
                      Created
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSubs.map((sub) => (
                    <tr
                      key={sub._id}
                      className="hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-black">
                        {sub.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                        {sub.email}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <StatusBadge isActive={isSubActive(sub)} />
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                        <PermissionBadges perms={sub.perms} />
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => handleMenuOpen(e, sub)}
                          className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 sm:space-y-4">
            {filteredSubs.map((sub) => (
              <div
                key={sub._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-medium text-black truncate">
                        {sub.name}
                      </h3>
                      <StatusBadge isActive={isSubActive(sub)} />
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                        <span className="truncate">{sub.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                        <span>Created {formatDate(sub.createdAt)}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-gray-600">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                        <PermissionBadges perms={sub.perms} compact />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleMenuOpen(e, sub)}
                    className="text-gray-400 hover:text-black transition-colors p-1.5 rounded-lg hover:bg-gray-100 inline-flex items-center justify-center hover:cursor-pointer shrink-0"
                    title="Actions"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {filteredSubs.length > 0 && totalPages > 0 && totalItems > 0 && (
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
    </div>
  );
}
