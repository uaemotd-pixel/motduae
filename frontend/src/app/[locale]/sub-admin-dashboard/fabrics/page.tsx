"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import PermissionGuard from "@/lib/auth/PermissionGuard";

interface FabricItem {
  _id: string;
  name: string;
  material: string;
  pricePerMeter: number;
  images: string[];
  listedByStore: string | { _id: string; name: string };
  city: string;
  storePickupAddress: {
    emirate: string;
    city: string;
    street?: string;
    building?: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFabricsPage() {
  const params = useParams();
  const localeParam = params.locale as string;
  const t = getTranslation(localeParam);

  const [items, setItems] = useState<FabricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.get<FabricItem[]>("/api/admin/fabrics");
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t.adminFabrics.list.load_error_title));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.adminFabrics.list.delete_confirm)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/fabrics/${id}`);
      await fetchItems();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, t.adminFabrics.list.delete_failed));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const material = item.material?.toLowerCase() || "";
      const storeName =
        typeof item.listedByStore === "object"
          ? item.listedByStore.name?.toLowerCase() || ""
          : "";
      const storeId =
        typeof item.listedByStore === "string"
          ? item.listedByStore.toLowerCase()
          : "";
      const city = item.city?.toLowerCase() || "";
      return (
        name.includes(term) ||
        material.includes(term) ||
        storeName.includes(term) ||
        storeId.includes(term) ||
        city.includes(term)
      );
    });
  }, [items, searchTerm]);

  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.filter((i) => !i.isActive).length;

  const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-white text-black border border-black/30"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {isActive
        ? t.adminFabrics.list.status_active
        : t.adminFabrics.list.status_inactive}
    </span>
  );

  const getStoreDisplay = (store: FabricItem["listedByStore"]) => {
    if (!store) return "—";
    if (typeof store === "object") return store.name;
    return store.length > 12
      ? `${store.slice(0, 6)}...${store.slice(-6)}`
      : store;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
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
                <div className="grid grid-cols-7 gap-4">
                  {[...Array(7)].map((_, j) => (
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
            {t.adminFabrics.list.load_error_title}
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={fetchItems}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            {t.adminFabrics.list.try_again}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPerm="fabrics">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
              {t.adminFabrics.list.title}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {t.adminFabrics.list.subtitle}
            </p>
          </div>
          <Link
            href="/sub-admin-dashboard/fabrics/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t.adminFabrics.list.new_button}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t.adminFabrics.list.total}
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {items.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t.adminFabrics.list.active}
            </p>
            <p className="text-2xl font-light text-black mt-1">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {t.adminFabrics.list.inactive}
            </p>
            <p className="text-2xl font-light text-black mt-1">
              {inactiveCount}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.adminFabrics.list.search_placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition"
            />
          </div>
          <button
            onClick={fetchItems}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white"
          >
            <RefreshCw className="w-4 h-4" /> {t.adminFabrics.list.refresh}
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {searchTerm
                ? t.adminFabrics.list.empty_search
                : t.adminFabrics.list.empty}
            </p>
            {!searchTerm && (
              <Link
                href="/sub-admin-dashboard/fabrics/new"
                className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600"
              >
                {t.adminFabrics.list.create_first}
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_name}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_material}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_price}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_store}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_city}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_status}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.adminFabrics.list.col_actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((item) => (
                    <tr
                      key={item._id}
                      className="group hover:bg-gray-50 transition-all duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.material}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        AED {item.pricePerMeter.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getStoreDisplay(item.listedByStore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.storePickupAddress.emirate || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge isActive={item.isActive} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/sub-admin-dashboard/fabrics/${item._id}/edit`}
                            className="text-gray-400 hover:text-black transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
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
    </PermissionGuard>
  );
}
