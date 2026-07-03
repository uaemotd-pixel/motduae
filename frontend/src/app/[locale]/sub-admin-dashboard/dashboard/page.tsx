"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import {
  ShoppingBag,
  Package,
  Coins,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";

// Updated interface matching backend response
interface DashboardStats {
  retail: {
    orderCount: number;
    revenue: number;
  };
  custom: {
    orderCount: number;
    revenue: number;
  };
  currency: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.get<DashboardStats>("/api/admin/dashboard");
        setStats(data);
        setError(null);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-64 bg-gray-100 rounded mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-6">
                <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
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
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-xl text-black">
            Unable to load dashboard
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { retail, custom, currency } = stats;
  const totalRevenue = retail.revenue + custom.revenue;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "AED",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-black tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back,{" "}
            <span className="text-black font-medium">
              {user?.name?.split(" ")[0] || "Admin"}
            </span>
          </p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <LocaleSwitcher />
          <div className="text-xs text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Retail Orders */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Retail Orders
              </p>
              <p className="text-4xl font-light text-black mt-2 tracking-tight">
                {retail.orderCount.toLocaleString()}
              </p>
              <div className="mt-3 text-xs text-gray-500">Total orders</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <ShoppingBag className="w-5 h-5 text-black" strokeWidth={1.2} />
            </div>
          </div>
        </div>

        {/* Custom Orders */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Custom Orders
              </p>
              <p className="text-4xl font-light text-black mt-2 tracking-tight">
                {custom.orderCount.toLocaleString()}
              </p>
              <div className="mt-3 text-xs text-gray-500">Total orders</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <Package className="w-5 h-5 text-black" strokeWidth={1.2} />
            </div>
          </div>
        </div>

        {/* Retail Revenue */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Retail Revenue
              </p>
              <p className="text-4xl font-light text-black mt-2 tracking-tight">
                {formatCurrency(retail.revenue)}
              </p>
              <div className="mt-3 text-xs text-gray-500">
                From retail orders
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <Coins className="w-5 h-5 text-black" strokeWidth={1.2} />
            </div>
          </div>
        </div>

        {/* Custom Revenue */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Custom Revenue
              </p>
              <p className="text-4xl font-light text-black mt-2 tracking-tight">
                {formatCurrency(custom.revenue)}
              </p>
              <div className="mt-3 text-xs text-gray-500">
                From custom orders
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <TrendingUp className="w-5 h-5 text-black" strokeWidth={1.2} />
            </div>
          </div>
        </div>

        {/* Total Revenue (highlighted) */}
        <div className="group bg-linear-to-br from-white to-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Revenue
              </p>
              <p className="text-4xl font-light text-black mt-2 tracking-tight">
                {formatCurrency(totalRevenue)}
              </p>
              <div className="mt-3 text-xs text-gray-500">
                All orders combined
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-gray-50 transition">
              <Coins className="w-5 h-5 text-black" strokeWidth={1.2} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity – placeholder (real data will come from another endpoint later) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.2} />
          <h3 className="text-sm font-medium text-black uppercase tracking-wider">
            Recent Activity
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <div className="w-2 h-2 bg-black rounded-full mt-1.5"></div>
              <div className="w-px h-full bg-gray-200 mt-2"></div>
            </div>
            <div className="pb-4">
              <p className="text-sm text-black">
                New retail order <span className="font-mono">#100234</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Just now</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5"></div>
              <div className="w-px h-full bg-gray-200 mt-2"></div>
            </div>
            <div className="pb-4">
              <p className="text-sm text-black">
                Tailor application:{" "}
                <span className="font-medium">Elegant Stitches</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">2 hours ago</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="relative flex flex-col items-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5"></div>
            </div>
            <div>
              <p className="text-sm text-black">
                Revenue milestone: {formatCurrency(totalRevenue)} reached
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Today</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
