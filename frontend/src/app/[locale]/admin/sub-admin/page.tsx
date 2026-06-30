"use client";

import { useEffect, useState, useMemo } from "react";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Edit, Trash2, Search, RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  perms: string[];
  createdAt: string;
}

export default function SubAdminPage() {
  const [subs, setSubs] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const data = await api.get<SubAdmin[]>("/api/subadmins");
      setSubs(data);
    } catch (err: any) {
      setSubs([]);
      console.error("Failed to fetch sub‑admins:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sub-admin?")) return;
    try {
      await api.delete(`/api/subadmins/${id}`);
      toast.success("Sub-admin deleted");
      fetchSubs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  const filteredSubs = useMemo(() => {
    if (!searchTerm) return subs;
    const term = searchTerm.toLowerCase();
    return subs.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term),
    );
  }, [subs, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--color-black)" }}
    >
      {filteredSubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <Users className="w-16 h-16 text-gray-300 mb-4" />
          {searchTerm ? (
            <>
              <p className="text-gray-500 text-sm">
                No results found for "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm">No sub‑admins yet</p>
              <Link href={`/admin/sub-admin/new`}>
                <button className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm">
                  Create First Sub Admin
                </button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl shadow-sm border overflow-hidden"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-gray-100">
            <div>
              <h1
                className="text-2xl md:text-3xl font-light tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sub‑Admins
              </h1>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-grey-muted)" }}
              >
                Manage sub‑administrators and their permissions
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 border-b border-gray-100">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-black transition"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin/sub-admin/new">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm">
                  Create Sub Admin
                </button>
              </Link>
              <button
                onClick={fetchSubs}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:text-black transition"
                style={{
                  color: "var(--color-grey-muted)",
                  borderColor: "var(--color-border)",
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: "var(--color-border-subtle)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-grey-muted)" }}
                  >
                    Name
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-grey-muted)" }}
                  >
                    Email
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-grey-muted)" }}
                  >
                    Created
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-grey-muted)" }}
                  >
                    Permissions
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--color-grey-muted)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                {filteredSubs.map((sub) => (
                  <tr
                    key={sub._id}
                    className="group hover:bg-gray-50 transition-all duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                      {sub.name}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      style={{ color: "var(--color-grey-muted)" }}
                    >
                      {sub.email}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      style={{ color: "var(--color-grey-muted)" }}
                    >
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-1">
                        {sub.perms && sub.perms.length > 0 ? (
                          sub.perms.map((perm) => (
                            <span
                              key={perm}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white border border-black/30 text-black"
                            >
                              {perm[0]}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/sub-admin/${sub._id}/edit`}>
                          <button
                            className="text-gray-400 hover:text-black transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(sub._id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
