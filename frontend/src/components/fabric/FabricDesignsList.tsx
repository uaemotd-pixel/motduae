"use client";

import { useCallback, useEffect, useState, useMemo, Fragment } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  deleteFabricItem,
  fetchFabricItems,
  isShopMissingError,
  type FabricProfile,
  type FabricVariantProfile,
} from "@/lib/fabricCatalog";
import { isLowStockQty } from "@/lib/lowStock";
import { LowStockBadge } from "@/components/shared/LowStockBadge";
import { useParams, useSearchParams } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  RefreshCw,
  Image as ImageIcon,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import { ImageModal } from "../shared/ImageModal";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";

type FabricCutRow = {
  cutId: string;
  price: number;
  stock: number;
  cut?: {
    _id: string;
    name: string;
    nameAr?: string;
    value: number;
    unit: string;
  } | null;
};

function getCutLabel(entry: FabricCutRow, locale: string): string {
  const cut = entry.cut;
  if (cut) {
    const name = locale === "ar" ? cut.nameAr || cut.name : cut.name;
    if (name?.trim()) return name.trim();
    return `${cut.value} ${cut.unit}`;
  }
  return entry.cutId;
}

function cutsHaveLowStock(cuts?: FabricCutRow[]) {
  return (cuts || []).some((entry) => isLowStockQty(Number(entry.stock) || 0));
}

function fabricHasLowStock(item: Pick<FabricProfile, "cuts" | "variants">) {
  if (cutsHaveLowStock(item.cuts as FabricCutRow[] | undefined)) return true;
  return (item.variants || []).some((variant) =>
    cutsHaveLowStock(variant.cuts as FabricCutRow[] | undefined),
  );
}

function FabricCutsCell({
  cuts,
  locale,
  stockLabel,
  lowLabel,
  outLabel,
}: {
  cuts?: FabricCutRow[];
  locale: string;
  stockLabel: string;
  lowLabel: string;
  outLabel: string;
}) {
  if (!cuts?.length) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <div className="space-y-1.5 min-w-48 max-w-xs">
      {cuts.map((entry) => {
        const stock = Number(entry.stock) || 0;
        const low = isLowStockQty(stock);
        const out = stock <= 0;
        return (
          <div
            key={entry.cutId}
            className={`rounded-lg border px-2 py-1.5 ${
              low
                ? "border-rose-200 bg-rose-50"
                : "border-gray-100 bg-gray-50/80"
            }`}
          >
            <p className="text-xs font-medium text-black leading-snug">
              {getCutLabel(entry, locale)}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-gray-500">
                AED {Number(entry.price).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <span
                  className={`tabular-nums text-xs font-semibold ${
                    low ? "text-rose-800" : "text-black"
                  }`}
                >
                  {stock} {stockLabel}
                </span>
                {out ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {outLabel}
                  </span>
                ) : low ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                    {lowLabel}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Reuse Toast configurations
const TOAST_BASE = {
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = params.locale === "ar" ? "ar" : "en";

  const [fabrics, setFabrics] = useState<FabricProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopMissing, setShopMissing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<
    Pick<FabricProfile, "_id" | "name" | "nameAr"> | FabricVariantProfile | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">(
    searchParams.get("stock") === "low" ? "low" : "all",
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [modalImage, setModalImage] = useState<{
    url: string;
    name: string;
  } | null>(null);

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
        toast.error(
          getApiErrorMessage(err, t("errors.loadFailed")),
          ERROR_TOAST,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadFabrics();
  }, [loadFabrics]);

  useEffect(() => {
    if (searchParams.get("stock") !== "low") return;
    setStockFilter("low");
  }, [searchParams]);

  const applyStockFilter = (next: "all" | "low") => {
    setStockFilter(next);
    if (next === "low") {
      router.replace("/fabric/fabrics?stock=low");
    } else if (searchParams.get("stock") === "low") {
      router.replace("/fabric/fabrics");
    }
  };

  const cutsCellProps = {
    locale,
    stockLabel: t("stockLabel"),
    lowLabel: t("lowBadge"),
    outLabel: t("outBadge"),
  };

  const openDeleteModal = (
    fabric:
      | Pick<FabricProfile, "_id" | "name" | "nameAr">
      | FabricVariantProfile,
  ) => {
    setItemToDelete(fabric);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;
    setItemToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    const fabric = itemToDelete;
    setDeletingId(fabric._id);
    try {
      await deleteFabricItem(fabric._id);
      setFabrics((prev) =>
        prev
          .filter((item) => item._id !== fabric._id)
          .map((item) => ({
            ...item,
            variants: item.variants?.filter(
              (variant) => variant._id !== fabric._id,
            ),
          })),
      );
      toast.success(t("deleted"), SUCCESS_TOAST);
      setItemToDelete(null);
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t("errors.deleteFailed")),
        ERROR_TOAST,
      );
    } finally {
      setDeletingId(null);
    }
  };

  const deleteTargetName = itemToDelete
    ? locale === "ar"
      ? itemToDelete.nameAr || itemToDelete.name
      : itemToDelete.name
    : "";

  const filteredFabrics = useMemo(() => {
    let list = fabrics;
    if (stockFilter === "low") {
      list = list.filter((item) => fabricHasLowStock(item) && item.isActive);
    }
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((item) => {
      const name = (
        locale === "ar" ? item.nameAr || item.name : item.name
      ).toLowerCase();
      const material = (
        locale === "ar" ? item.materialAr || item.material : item.material
      ).toLowerCase();
      return name.includes(term) || material.includes(term);
    });
  }, [fabrics, searchTerm, locale, stockFilter]);

  useEffect(() => {
    if (stockFilter !== "low") return;
    const next: Record<string, boolean> = {};
    for (const item of filteredFabrics) {
      const variantLow = (item.variants || []).some((variant) =>
        cutsHaveLowStock(variant.cuts as FabricCutRow[] | undefined),
      );
      if (variantLow) next[item._id] = true;
    }
    if (Object.keys(next).length === 0) return;
    setExpandedRows((prev) => ({ ...prev, ...next }));
  }, [filteredFabrics, stockFilter]);

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
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
            {locale === "ar" ? "إجمالي الأقمشة" : "TOTAL FABRICS"}
          </p>
          <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">
            {fabrics.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
            {locale === "ar" ? "نشط" : "ACTIVE"}
          </p>
          <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider [font-family:var(--font-ui)]">
            {locale === "ar" ? "غير نشط" : "INACTIVE"}
          </p>
          <p className="text-2xl font-light text-black mt-1 [font-family:var(--font-display)]">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Search and Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => applyStockFilter("all")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              stockFilter === "all"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {t("tabAll")}
          </button>
          <button
            type="button"
            onClick={() => applyStockFilter("low")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors hover:cursor-pointer whitespace-nowrap ${
              stockFilter === "low"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            {t("tabLowStock")}
          </button>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                locale === "ar"
                  ? "البحث بالاسم أو المادة..."
                  : "Search by name or material..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition [font-family:var(--font-body)]"
            />
          </div>
          <button
            onClick={loadFabrics}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-black transition text-sm border border-gray-200 rounded-lg bg-white [font-family:var(--font-ui)]"
          >
            <RefreshCw className="w-4 h-4" />{" "}
            {locale === "ar" ? "تحديث" : "Refresh"}
          </button>
        </div>
      </div>

      {stockFilter === "low" && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-rose-700/80">
              {t("tabLowStock")}
            </p>
            <p className="text-sm text-rose-900 mt-0.5">{t("lowStockHint")}</p>
          </div>
        </div>
      )}

      {filteredFabrics.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 [font-family:var(--font-body)]">
            {searchTerm
              ? locale === "ar"
                ? "لم يتم العثور على أقمشة تطابق بحثك."
                : "No fabrics matched your search."
              : stockFilter === "low"
                ? t("emptyLowStock")
                : t("empty")}
          </p>
          {!searchTerm && stockFilter === "all" && (
            <Link
              href="/fabric/fabrics/new"
              className="inline-block mt-4 text-black underline underline-offset-4 hover:text-gray-600 [font-family:var(--font-ui)]"
            >
              {t("addFirst")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {filteredFabrics.map((fabric) => {
              const name =
                locale === "ar" ? fabric.nameAr || fabric.name : fabric.name;
              const materialDisplay =
                locale === "ar"
                  ? fabric.materialAr || fabric.material
                  : fabric.material;
              const itemLow = fabricHasLowStock(fabric);
              return (
                <div
                  key={fabric._id}
                  className={`rounded-xl border p-3 ${
                    itemLow
                      ? "border-rose-200 bg-rose-50/80"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    {fabric.images && fabric.images.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setModalImage({ url: fabric.images[0], name })
                        }
                        className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                      >
                        <img
                          src={fabric.images[0]}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-black leading-snug">
                          {name}
                        </p>
                        <span
                          className={`shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            fabric.isActive
                              ? "border border-black/30 text-black"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {fabric.isActive
                            ? t("statusActive")
                            : t("statusInactive")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {materialDisplay}
                      </p>
                      {itemLow ? (
                        <div className="mt-1">
                          <LowStockBadge label={t("lowBadge")} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/fabric/fabrics/${fabric._id}/edit`}
                      className="flex-1 text-center px-3 py-2 border border-black text-black text-[10px] tracking-[0.16em] uppercase"
                    >
                      {locale === "ar" ? "تعديل" : "Edit"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(fabric)}
                      disabled={deletingId === fabric._id}
                      className="flex-1 px-3 py-2 border border-red-300 text-red-700 text-[10px] tracking-[0.16em] uppercase disabled:opacity-50"
                    >
                      {locale === "ar" ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                      {locale === "ar" ? "الصورة" : "IMAGE"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                      {locale === "ar" ? "الاسم" : "NAME"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                      {locale === "ar" ? "المادة" : "MATERIAL"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                      {locale === "ar" ? "القصات" : "CUTS"}
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
                    const name =
                      locale === "ar"
                        ? fabric.nameAr || fabric.name
                        : fabric.name;
                    const materialDisplay =
                      locale === "ar"
                        ? fabric.materialAr || fabric.material
                        : fabric.material;
                    const itemLow = fabricHasLowStock(fabric);
                    return (
                      <Fragment key={fabric._id}>
                        <tr
                          className={`group transition-all duration-200 ${
                            itemLow
                              ? "bg-rose-50/80 hover:bg-rose-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {fabric.images && fabric.images.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalImage({ url: fabric.images[0], name })
                                }
                                className="cursor-pointer"
                              >
                                <img
                                  src={fabric.images[0]}
                                  alt={name}
                                  className="w-10 h-10 rounded-lg object-cover hover:ring-2 hover:ring-black/20 transition-all"
                                />
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-black [font-family:var(--font-body)]">
                            <div>
                              {name}
                              {itemLow && (
                                <div className="mt-1">
                                  <LowStockBadge label={t("lowBadge")} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 [font-family:var(--font-body)]">
                            {materialDisplay}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 [font-family:var(--font-body)]">
                            <FabricCutsCell
                              cuts={fabric.cuts as FabricCutRow[] | undefined}
                              {...cutsCellProps}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium [font-family:var(--font-ui)] ${
                                fabric.isActive
                                  ? "bg-white text-black border border-black/30"
                                  : "bg-gray-100 text-gray-500 border border-gray-200"
                              }`}
                            >
                              {fabric.isActive
                                ? t("statusActive")
                                : t("statusInactive")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-3">
                              {fabric.variants &&
                                fabric.variants.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [fabric._id]: !prev[fabric._id],
                                      }));
                                    }}
                                    className="px-2 py-1 border border-black/25 text-[10px] font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition rounded cursor-pointer"
                                  >
                                    {expandedRows[fabric._id]
                                      ? locale === "ar"
                                        ? "إخفاء الخيارات"
                                        : "Hide variants"
                                      : locale === "ar"
                                        ? `عرض الخيارات (${fabric.variants.length})`
                                        : `Show variant (${fabric.variants.length})`}
                                  </button>
                                )}
                              <Link
                                href={`/fabric/fabrics/${fabric._id}/edit`}
                                className="text-gray-400 hover:text-black transition-colors"
                                title={locale === "ar" ? "تعديل" : "Edit"}
                              >
                                <Edit className="w-4.5 h-4.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(fabric)}
                                disabled={deletingId === fabric._id}
                                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                title={locale === "ar" ? "حذف" : "Delete"}
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRows[fabric._id] &&
                          fabric.variants &&
                          fabric.variants.length > 0 && (
                            <tr className="bg-[#FAF9F5]/45">
                              <td colSpan={6} className="px-6 py-4">
                                <div
                                  className={`space-y-2.5 ${locale === "ar" ? "pr-8 text-right" : "pl-8 text-left"}`}
                                >
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55 block">
                                    {locale === "ar"
                                      ? "الخيارات البديلة"
                                      : "Variations"}
                                  </span>
                                  <div className="border border-gray-200/60 rounded-xl bg-white shadow-sm overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-100">
                                      <thead className="bg-gray-50/70">
                                        <tr>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                            {locale === "ar" ? "الاسم" : "NAME"}
                                          </th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                            {locale === "ar"
                                              ? "المادة"
                                              : "MATERIAL"}
                                          </th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                            {locale === "ar"
                                              ? "القصات"
                                              : "CUTS"}
                                          </th>
                                          <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                            {locale === "ar"
                                              ? "الحالة"
                                              : "STATUS"}
                                          </th>
                                          <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider [font-family:var(--font-ui)]">
                                            {locale === "ar"
                                              ? "الإجراءات"
                                              : "ACTIONS"}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 bg-white">
                                        {fabric.variants.map((v) => {
                                          const vName =
                                            locale === "ar"
                                              ? v.nameAr || v.name
                                              : v.name;
                                          const vMaterial =
                                            locale === "ar"
                                              ? v.materialAr || v.material
                                              : v.material;
                                          const variantLow = cutsHaveLowStock(
                                            v.cuts as
                                              | FabricCutRow[]
                                              | undefined,
                                          );
                                          return (
                                            <tr
                                              key={v._id}
                                              className={
                                                variantLow
                                                  ? "bg-rose-50/80 hover:bg-rose-50"
                                                  : "hover:bg-gray-50/60 transition-colors"
                                              }
                                            >
                                              <td className="px-4 py-3 text-xs font-semibold text-black [font-family:var(--font-body)]">
                                                <div className="flex items-center gap-2">
                                                  {v.images &&
                                                  v.images.length > 0 ? (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setModalImage({
                                                          url: v.images[0],
                                                          name,
                                                        })
                                                      }
                                                      className="cursor-pointer"
                                                    >
                                                      <img
                                                        src={v.images[0]}
                                                        alt={vName}
                                                        className="w-8 h-8 rounded-lg object-cover"
                                                      />
                                                    </button>
                                                  ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                                      <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    </div>
                                                  )}
                                                  <div>
                                                    <span>{vName}</span>
                                                    {variantLow && (
                                                      <div className="mt-1">
                                                        <LowStockBadge
                                                          label={t("lowBadge")}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 [font-family:var(--font-body)]">
                                                {vMaterial}
                                              </td>
                                              <td className="px-4 py-3 text-xs text-gray-600 [font-family:var(--font-body)]">
                                                <FabricCutsCell
                                                  cuts={
                                                    v.cuts as
                                                      | FabricCutRow[]
                                                      | undefined
                                                  }
                                                  {...cutsCellProps}
                                                />
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap">
                                                <span
                                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium [font-family:var(--font-ui)] ${
                                                    v.isActive
                                                      ? "bg-white text-black border border-black/30"
                                                      : "bg-gray-100 text-gray-500"
                                                  }`}
                                                >
                                                  {v.isActive
                                                    ? locale === "ar"
                                                      ? "نشط"
                                                      : "Active"
                                                    : locale === "ar"
                                                      ? "غير نشط"
                                                      : "Inactive"}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                                <div className="flex items-center justify-end gap-3">
                                                  <Link
                                                    href={`/fabric/fabrics/${v._id}/edit`}
                                                    className="text-gray-400 hover:text-black transition-colors"
                                                    title={
                                                      locale === "ar"
                                                        ? "تعديل"
                                                        : "Edit"
                                                    }
                                                  >
                                                    <Edit className="w-4 h-4" />
                                                  </Link>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      openDeleteModal(v)
                                                    }
                                                    disabled={
                                                      deletingId === v._id
                                                    }
                                                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                                    title={
                                                      locale === "ar"
                                                        ? "حذف"
                                                        : "Delete"
                                                    }
                                                  >
                                                    <Trash2 className="w-4 h-4" />
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
                              </td>
                            </tr>
                          )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={!!modalImage}
        imageUrl={modalImage?.url ?? ""}
        alt={modalImage?.name ?? "Fabric image"}
        onClose={() => setModalImage(null)}
      />

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={t("delete")}
        message={t("confirmDelete", { name: deleteTargetName })}
        confirmLabel={deletingId ? t("deleting") : t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isLoading={!!deletingId}
        isDanger
      />
    </div>
  );
}
