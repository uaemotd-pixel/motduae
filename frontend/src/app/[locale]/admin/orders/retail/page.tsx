"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PackageSearch, AlertTriangle, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

type RetailOrder = {
  _id: string;
  userId: {
    name: string;
    email: string;
  } | null;
  orderItems: {
    name: string;
    quantity: number;
    image: string;
    size?: string;
    slug?: string;
  }[];
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
};

const RETAIL_ORDER_STATUSES: RetailOrder['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

export default function AdminRetailOrdersPage() {
  const tRetail = useTranslations('Admin.OrdersRetail');
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await api.get<RetailOrder[]>("/api/admin/orders/retail");
        setOrders(data);
        setError(null);
      } catch (err: any) {
        console.error("Retail orders fetch error:", err);
        setError(err.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, status: RetailOrder['status']) => {
    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));
    setActiveDropdown(null);
    try {
      const response = await api.patch<any>(
        `/api/admin/orders/${orderId}/status`,
        { status }
      );
      
      const updatedOrder = response?.order || response?.data?.order || response;
      
      if (updatedOrder && updatedOrder.status) {
        setOrders((prevOrders) =>
          prevOrders.map((o) => (o._id === orderId ? { ...o, status: updatedOrder.status } : o))
        );
      } else {
        setOrders((prevOrders) =>
          prevOrders.map((o) => (o._id === orderId ? { ...o, status: status } : o))
        );
      }
    } catch (err: any) {
      console.error("Status update error details:", err);
      setOrders((prevOrders) =>
        prevOrders.map((o) => (o._id === orderId ? { ...o, status: status } : o))
      );
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AED',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
          <div className="bg-white rounded-xl border p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center bg-white p-8 rounded-2xl border max-w-md shadow-sm">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p className="font-semibold text-xl text-black">Error Loading Orders</p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-light text-black tracking-tight">Retail Orders</h1>
        <p className="text-gray-500 mt-1 text-sm">Monitor and update delivery fulfillment status pipelines for ready-made items.</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border py-20">
          <PackageSearch className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-black">No Retail Orders Placed</h3>
          <p className="text-gray-500 mt-1 max-w-sm">When customers checkout ready-made garments via COD, entries appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-full">
            <table className="w-full text-left border-collapse">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.map((order) => (
                  <tr key={order._id} className="block md:table-row hover:bg-gray-50/50 transition-colors group">
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</span>
                        <div className="font-mono text-sm font-medium text-gray-900">#{order._id.slice(-6).toUpperCase()}</div>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</span>
                        <div className="text-right md:text-left">
                          <div className="font-medium text-gray-900 text-sm">{order.userId?.name || 'Guest'}</div>
                          <div className="text-sm text-gray-500">{order.userId?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</span>
                        <div className="text-right md:text-left">
                          <div className="text-sm text-gray-900 max-w-[180px] md:max-w-[200px] truncate">
                            {order.orderItems.map(item => item.name).join(', ')}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {order.orderItems.reduce((acc, item) => acc + item.quantity, 0)} items
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none md:text-right">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                        <div className="font-medium text-gray-900 text-sm">
                          {formatCurrency(order.totalPrice, order.currency)}
                        </div>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 border-b border-gray-50 md:border-none">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </td>
                    <td className="block md:table-cell px-4 md:px-6 py-3 md:py-4 md:text-right">
                      <div className="flex justify-between md:block items-center">
                        <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
                        <div className="inline-block relative text-left">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === order._id ? null : order._id)}
                            disabled={updatingStatus[order._id]}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all shadow-sm disabled:opacity-50"
                          >
                            Update
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          </button>

                          {activeDropdown === order._id && (
                            <>
                              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                                {RETAIL_ORDER_STATUSES.map((status) => (
                                  <button
                                    key={status}
                                    disabled={order.status === status || updatingStatus[order._id]}
                                    onClick={() => handleStatusChange(order._id, status)}
                                    className={`w-full text-left px-4 py-2 text-sm capitalize transition-colors flex items-center justify-between ${
                                      order.status === status 
                                        ? 'text-gray-400 bg-gray-50 cursor-not-allowed' 
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                  >
                                    {status}
                                    {order.status === status && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
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