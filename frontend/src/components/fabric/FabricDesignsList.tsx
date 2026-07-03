"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  deleteFabricItem,
  fetchFabricItems,
  isShopMissingError,
  type FabricProfile,
} from "@/lib/fabricCatalog";
import { useParams } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  RefreshCw,
} from "lucide-react";

// Reuse Toast configurations
const TOAST_BASE = {
    position: "top-right" as const,
    duration: 6000,
    style: {
        fontFamily: "var(--font-body)",
        fontSize: "13px",
        letterSpacing: "0.04em",
        borderRadius: "0",
        padding: "14px 18px",
        maxWidth: "360px",
    },
};

const SUCCESS_TOAST = {
    ...TOAST_BASE,
    style: {
        ...TOAST_BASE.style,
        background: "#f0fdf4",
        color: "#166534",
        border: "1px solid #86efac",
    },
    iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
};

const ERROR_TOAST = {
    ...TOAST_BASE,
    style: {
        ...TOAST_BASE.style,
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
    },
    iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

export default function FabricDesignsList() {
    const t = useTranslations("FabricPortal.fabrics");
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";

    const [fabrics, setFabrics] = useState<FabricProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [shopMissing, setShopMissing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const loadFabrics = useCallback(async () => {
        setLoading(true);
        setShopMissing(false);

        try {
            const items = await fetchFabricItems();
            setFabrics(items);
        } catch (err: unknown) {
            if (isShopMissingError(err)) {
                setShopMissing(true);
            } else {
                toast.error(getApiErrorMessage(err, t("errors.loadFailed")), ERROR_TOAST);
            }
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadFabrics();
    }, [loadFabrics]);

    const handleDelete = async (fabric: FabricProfile) => {
        const name = locale === "ar" ? fabric.nameAr || fabric.name : fabric.name;
        if (!window.confirm(t("confirmDelete", { name }))) return;

        setDeletingId(fabric._id);
        try {
            await deleteFabricItem(fabric._id);
            setFabrics((prev) => prev.filter((item) => item._id !== fabric._id));
            toast.success(t("deleted"), SUCCESS_TOAST);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, t("errors.deleteFailed")), ERROR_TOAST);
        } finally {
            setDeletingId(null);
        }
    };

    const filteredFabrics = useMemo(() => {
        if (!searchTerm) return fabrics;
        const term = searchTerm.toLowerCase();
        return fabrics.filter((item) => {
            const name = (locale === "ar" ? item.nameAr || item.name : item.name).toLowerCase();
            const material = (locale === "ar" ? item.materialAr || item.material : item.material).toLowerCase();
            return name.includes(term) || material.includes(term);
        });
    }, [fabrics, searchTerm, locale]);

    const activeCount = fabrics.filter((i) => i.isActive).length;
    const inactiveCount = fabrics.filter((i) => !i.isActive).length;

    if (loading) {
        return (
            <div className="max-w-5xl border border-(--color-border) bg-white p-8">
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {t("loading")}
                </p>
            </div>
        );
    }

    if (shopMissing) {
        return (
            <div className="max-w-2xl border border-(--color-border) bg-white p-8">
                <h1 className="[font-family:var(--font-display)] text-[28px] text-black mb-3">
                    {t("shopRequiredTitle")}
                </h1>
                <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-6">
                    {t("shopRequiredDescription")}
                </p>
                <Link
                    href="/fabric/shop"
                    className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
                >
                    {t("shopRequiredCta")}
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight [font-family:var(--font-display)]">
                        {t("title")}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 [font-family:var(--font-body)]">
                        {t("description")}
                    </p>
                </div>
                <Link
                    href="/fabric/fabrics/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm shadow-sm [font-family:var(--font-ui)]"
                >
                    <Plus className="w-4 h-4" /> {t("addFabric")}
                </Link>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
                        {locale === "ar" ? "إجمالي الأقمشة" : "TOTAL FABRICS"}
                    </p>
                    <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">{fabrics.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
                        {locale === "ar" ? "نشط" : "ACTIVE"}
                    </p>
                    <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">{activeCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
                        {locale === "ar" ? "غير نشط" : "INACTIVE"}
                    </p>
                    <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">{inactiveCount}</p>
                </div>
            </div>

            {/* Search and Refresh */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={locale === "ar" ? "البحر بالاسم أو المادة..." : "Search by name or material..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition [font-family:var(--font-body)]"
                    />
                </div>
                <button
                    onClick={loadFabrics}
                    className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white [font-family:var(--font-ui)]"
                >
                    <RefreshCw className="w-4 h-4" /> {locale === "ar" ? "تحديث" : "Refresh"}
                </button>
            </div>

            {filteredFabrics.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 [font-family:var(--font-body)]">
                        {searchTerm
                            ? (locale === "ar" ? "لم يتم العثور على أقمشة تطابق بحثك." : "No fabrics matched your search.")
                            : t("empty")}
                    </p>
                    {!searchTerm && (
                        <Link
                            href="/fabric/fabrics/new"
                            className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600 [font-family:var(--font-ui)]"
                        >
                            {t("addFirst")}
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "الاسم" : "NAME"}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "المادة" : "MATERIAL"}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "السعر / متر" : "PRICE / M"}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "المخزون" : "STOCK"}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "الحالة" : "STATUS"}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                        {locale === "ar" ? "الإجراءات" : "ACTIONS"}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {filteredFabrics.map((fabric) => {
                                    const name = locale === "ar" ? fabric.nameAr || fabric.name : fabric.name;
                                    const materialDisplay = locale === "ar" ? fabric.materialAr || fabric.material : fabric.material;
                                    return (
                                        <tr
                                            key={fabric._id}
                                            className="group hover:bg-gray-50 transition-all duration-200"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black [font-family:var(--font-body)]">
                                                {name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 [font-family:var(--font-body)]">
                                                {materialDisplay}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 [font-family:var(--font-body)]">
                                                AED {fabric.pricePerMeter.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 [font-family:var(--font-body)]">
                                                {fabric.stockInMeters.toLocaleString()} m
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium [font-family:var(--font-ui)] ${
                                                        fabric.isActive
                                                            ? "bg-white text-black border border-black/30"
                                                            : "bg-gray-100 text-gray-500 border border-gray-200"
                                                    }`}
                                                >
                                                    {fabric.isActive ? t("statusActive") : t("statusInactive")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Link
                                                        href={`/fabric/fabrics/${fabric._id}/edit`}
                                                        className="text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <Edit className="w-4.5 h-4.5" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(fabric)}
                                                        disabled={deletingId === fabric._id}
                                                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
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
