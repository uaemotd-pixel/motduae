"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

type RetailOrderStatus =
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled";

type RetailOrderItem = {
    name: string;
    image?: string;
};

type RetailOrder = {
    id: string;
    _id?: string;
    date: string;
    createdAt?: string;
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
    totalPrice: number;
    currency: string;
    firstItem?: {
        name: string;
        image?: string;
        size?: string;
    };
    items?: RetailOrderItem[];
};

const statusStyles: Record<RetailOrderStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

export default function UserOrders() {
    const router = useRouter();

    const [orders, setOrders] = useState<RetailOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError(null);

                // ✅ Correct API endpoint (ensure this matches backend)
                const res = await api.get("/api/orders/retail/mine");

                console.log("ORDERS RAW RESPONSE:", res);

                // ✅ SAFE NORMALIZATION (prevents map crash forever)
                const normalizedOrders: RetailOrder[] =
                    Array.isArray(res)
                        ? res
                        : res?.orders ||
                        res?.data ||
                        res?.result?.orders ||
                        [];

                setOrders(normalizedOrders);
            } catch (err: any) {
                console.log("ORDER FETCH ERROR:", err);

                setError(
                    err?.message ||
                    "Failed to load orders"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // ================= LOADING =================
    if (loading) {
        return (
            <div>
                <h1 className="text-4xl font-['Ivy_Ora'] mb-6">
                    My Orders
                </h1>
                <div className="bg-white border p-6 rounded-xl">
                    Loading orders...
                </div>
            </div>
        );
    }

    // ================= ERROR =================
    if (error) {
        return (
            <div>
                <h1 className="text-4xl font-['Ivy_Ora'] mb-6">
                    My Orders
                </h1>
                <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl">
                    {error}
                </div>
            </div>
        );
    }

    // ================= SAFE GUARD =================
    const safeOrders: RetailOrder[] = Array.isArray(orders)
        ? orders
        : [];

    return (
        <div>
            <h1 className="text-4xl font-['Ivy_Ora'] mb-6">
                My Orders
            </h1>

            {/* Orders list */}
            <div className="bg-white border rounded-xl divide-y">
                {safeOrders.length === 0 ? (
                    <div className="p-6 text-gray-500">
                        No orders yet.
                    </div>
                ) : (
                    orders.map((order) => {
                        const item = order.firstItem;

                        return (
                            <div
                                key={order.id}
                                onClick={() => router.push(`/orders/${order.id}`)}
                                className="p-5 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition"
                            >
                                {/* LEFT */}
                                <div className="flex items-center gap-4">
                                    {item?.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-md object-cover border"
                                        />
                                    )}

                                    <div>
                                        <p className="font-medium">
                                            Order #{order.id.slice(-6)}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {item?.name || "No item"}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {new Date(order.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT */}
                                <div className="text-right">
                                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                                        {order.status}
                                    </span>

                                    <p className="mt-2 font-semibold">
                                        {order.currency} {order.totalPrice.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}