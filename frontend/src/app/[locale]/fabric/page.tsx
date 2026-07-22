"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { Search, PackageSearch, Loader2, DollarSign } from "lucide-react";
import type { Locale } from "@/i18n/routing";

interface OrderUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface CustomOrderItemPricing {
  designBase: number;
  fabricMeters: number;
  fabricPricePerMeter: number;
  fabricCost: number;
  tailoringFee: number;
  deliveryFee: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
}

interface CustomOrderItem {
  designSnapshot: {
    name: string;
    nameAr?: string;
  };
  fabricSnapshot?: {
    name: string;
    nameAr?: string;
  } | null;
  fabricStoreId?:
    | {
        _id: string;
        name: string;
      }
    | string;
  pricing?: CustomOrderItemPricing;
}

interface Order {
  _id: string;
  userId: OrderUser | string | null;
  status: string;
  createdAt: string;
  pricing: {
    total: number;
    currency: string;
    fabricCost?: number;
  };
  items?: CustomOrderItem[];
}

export default function FabricDashboardPage() {
  const t = useTranslations("FabricPortal.dashboard");
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as Locale) || "en";

  // Pricing integration states
  const [pricingOrders, setPricingOrders] = useState<Order[]>([]);
  const [fabricShopId, setFabricShopId] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");

  useEffect(() => {
    const fetchPricingOrders = async () => {
      try {
        setPricingLoading(true);
        const data = await api.get<{
          success: boolean;
          items: Order[];
          fabricShopId?: string;
        }>("/api/fabric/orders");
        setPricingOrders(data.items || []);
        if (data.fabricShopId) {
          setFabricShopId(data.fabricShopId);
        }
      } catch (err) {
        console.error("Pricing fetch error:", err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricingOrders();
  }, []);

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
    }).format(amount);

  const getFabricFee = (order: Order) => {
    if (!fabricShopId) return 0;
    if (order.items && order.items.length > 0) {
      return order.items
        .filter((item) => {
          const itemStoreId =
            typeof item.fabricStoreId === "object"
              ? item.fabricStoreId?._id
              : item.fabricStoreId;
          return itemStoreId === fabricShopId;
        })
        .reduce((sum, item) => sum + (item.pricing?.fabricCost || 0), 0);
    }
    return order.pricing?.fabricCost || 0;
  };

  const readPartnerName = (
    value: { name?: string } | string | null | undefined,
    fallback: string,
  ): string => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value.name || fallback;
  };

  const formatOrderDateLocal = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-AE" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  };

  const filteredPricingOrders = useMemo(() => {
    return pricingOrders.filter((order) => {
      if (pricingSearch.trim()) {
        const term = pricingSearch.toLowerCase();
        const customerName = readPartnerName(
          order.userId && typeof order.userId === "object"
            ? order.userId
            : null,
          "",
        ).toLowerCase();
        const customerEmail = (
          order.userId && typeof order.userId === "object"
            ? order.userId.email || ""
            : ""
        ).toLowerCase();
        const orderIdHex = order._id.toLowerCase();
        return (
          customerName.includes(term) ||
          customerEmail.includes(term) ||
          orderIdHex.includes(term)
        );
      }
      return true;
    });
  }, [pricingOrders, pricingSearch]);

  const isAr = locale === "ar";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
          {t("eyebrow")}
        </p>
        <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] text-black mb-4">
          {t("title", { name: user?.name || "" })}
        </h1>
        <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/fabric/shop"
          className="block border border-(--color-border) bg-white p-6 hover:border-black transition"
        >
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
            {t("shopCardEyebrow")}
          </p>
          <p className="[font-family:var(--font-display)] text-[20px] text-black">
            {t("shopCardTitle")}
          </p>
        </Link>
        <Link
          href="/fabric/fabrics"
          className="block border border-(--color-border) bg-white p-6 hover:border-black transition"
        >
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
            {t("fabricsCardEyebrow")}
          </p>
          <p className="[font-family:var(--font-display)] text-[20px] text-black">
            {t("fabricsCardTitle")}
          </p>
        </Link>
      </div>

      {/* Fabric Store Pricing & Fees Section */}
      <div className="bg-white border border-(--color-border) p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-black flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-black" strokeWidth={1.5} />
              {isAr ? "تسعير مبيعات الأقمشة" : "Fabric Sales Pricing"}
            </h3>
            <p className="[font-family:var(--font-body)] text-xs text-(--color-grey-muted) mt-1">
              {isAr
                ? "مراقبة مستحقات وتكاليف الأقمشة لكل طلب من طلباتك."
                : "Monitor fabric fees and payouts scoped to your store."}
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                isAr ? "البحث عن عميل أو طلب..." : "Search customer or order..."
              }
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-black text-black bg-white transition"
            />
          </div>
        </div>

        {pricingLoading && pricingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-black mb-3" />
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">
              {isAr ? "جاري التحميل..." : "Loading data..."}
            </p>
          </div>
        ) : filteredPricingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageSearch
              className="w-12 h-12 text-gray-300 mb-3"
              strokeWidth={1}
            />
            <p className="text-xs text-gray-400">
              {isAr
                ? "لا توجد طلبات متطابقة."
                : "No orders found matching filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-gray-500">
              <thead className="bg-gray-50/70 text-[9px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">
                    {isAr ? "رقم الطلب" : "Order ID"}
                  </th>
                  <th className="px-4 py-3">{isAr ? "العميل" : "Customer"}</th>
                  <th className="px-4 py-3">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="px-4 py-3">
                    {isAr ? "رسوم القماش" : "Fabric Fee"}
                  </th>
                  <th className="px-4 py-3">{isAr ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPricingOrders.map((order) => {
                  const customerName = readPartnerName(
                    order.userId && typeof order.userId === "object"
                      ? order.userId
                      : null,
                    isAr ? "عميل غير معروف" : "Unknown Customer",
                  );
                  const fabricFee = getFabricFee(order);

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-black text-2xs">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-black block">
                          {customerName}
                        </span>
                        {order.userId && typeof order.userId === "object" && (
                          <span className="text-3xs text-gray-400 block mt-0.5">
                            {order.userId.email}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-2xs">
                        {formatOrderDateLocal(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-black font-semibold">
                        {formatCurrency(fabricFee, order.pricing.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
