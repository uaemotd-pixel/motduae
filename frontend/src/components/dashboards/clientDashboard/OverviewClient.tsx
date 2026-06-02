"use client";

import { useState, useEffect } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// ─── Types ────────────────────────────────────────────────────────────────
type TabId =
    | "overview"
    | "orders"
    | "wishlist"
    | "samples"
    | "addresses"
    | "payments"
    | "reviews"
    | "settings";

// ─── Mock Data for Charts ─────────────────────────────────────────────────
const monthlyData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    orders: [12, 19, 15, 25, 22, 30, 28, 35, 42, 48, 52, 58],
    revenue: [12500, 15800, 14200, 22800, 21500, 28500, 26800, 32500, 38800, 42500, 48500, 52800],
};

const categoryData = {
    labels: ["Silk", "Velvet", "Cotton", "Embroidered", "Wool", "Linen"],
    values: [35, 25, 15, 12, 8, 5],
};

const recentOrders = [
    { id: "MOTD-1234", date: "2024-05-15", status: "Delivered", total: 2450, items: 3 },
    { id: "MOTD-1235", date: "2024-05-20", status: "Shipped", total: 890, items: 1 },
    { id: "MOTD-1236", date: "2024-05-25", status: "Processing", total: 3420, items: 4 },
    { id: "MOTD-1237", date: "2024-06-01", status: "Delivered", total: 1250, items: 2 },
    { id: "MOTD-1238", date: "2024-06-05", status: "Processing", total: 2100, items: 3 },
];

const wishlistItems = [
    { id: 1, name: "Royal Gold Damask", price: 1200, inStock: true },
    { id: 2, name: "Midnight Floral Velvet", price: 950, inStock: true },
    { id: 3, name: "Diamond Geometric Cotton", price: 680, inStock: false },
    { id: 4, name: "Opal Silk Jacquard", price: 1250, inStock: true },
];

// ─── Navigation Items ─────────────────────────────────────────────────────
const navigationItems: { id: TabId; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "orders", label: "Orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
    { id: "wishlist", label: "Wishlist", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { id: "samples", label: "Fabric Samples", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "addresses", label: "Address Book", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "payments", label: "Payment Methods", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { id: "reviews", label: "My Reviews", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

// ─── Status Badge Component ───────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        Processing: "bg-[#1A1A1A] text-white",
        Shipped: "bg-black text-white",
        Delivered: "bg-[#E8E8E4] text-black",
        Cancelled: "bg-[#F2F2F0] text-[#5A5A56]",
    };

    return (
        <span className={`text-[9px] tracking-[0.16em] uppercase font-mono px-2.5 py-1 ${styles[status] || styles.Processing}`}>
            {status}
        </span>
    );
};

// ─── Chart Configuration ──────────────────────────────────────────────────
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: "bottom" as const,
            labels: {
                font: { family: "'TT Norms Pro Mono', monospace", size: 10 },
                color: "#5A5A56",
                usePointStyle: true,
                boxWidth: 8,
            },
        },
        tooltip: {
            backgroundColor: "#000000",
            titleColor: "#FFFFFF",
            bodyColor: "#E8E8E4",
            titleFont: { family: "'TT Norms Pro Mono', monospace", size: 10 },
            bodyFont: { family: "'TT Norms Pro', sans-serif", size: 11 },
            padding: 10,
            cornerRadius: 0,
        },
    },
};

const lineChartData = {
    labels: monthlyData.labels,
    datasets: [
        {
            label: "Orders",
            data: monthlyData.orders,
            borderColor: "#000000",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#000000",
            pointBorderColor: "#FFFFFF",
            pointRadius: 3,
            pointHoverRadius: 5,
        },
    ],
};

const revenueChartData = {
    labels: monthlyData.labels,
    datasets: [
        {
            label: "Revenue (AED)",
            data: monthlyData.revenue,
            borderColor: "#1A1A1A",
            backgroundColor: "rgba(26, 26, 26, 0.1)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#1A1A1A",
            pointBorderColor: "#FFFFFF",
            pointRadius: 3,
            pointHoverRadius: 5,
        },
    ],
};

const categoryChartData = {
    labels: categoryData.labels,
    datasets: [
        {
            data: categoryData.values,
            backgroundColor: ["#000000", "#1A1A1A", "#2A2A2A", "#3A3A3A", "#4A4A4A", "#5A5A5A"],
            borderColor: "#FFFFFF",
            borderWidth: 1,
        },
    ],
};

// ─── Overview Content with Charts ─────────────────────────────────────────
const OverviewContent = () => {
    const stats = [
        { label: "Total Orders", value: "58", change: "+12%", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
        { label: "Total Spent", value: "AED 48,250", change: "+18%", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        { label: "Wishlist", value: "12", change: "+3", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
        { label: "Reviews", value: "8", change: "+2", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="mb-2">
                <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-black">
                    Welcome back, Sarah
                </h1>
                <p className="text-[12px] text-[#5A5A56] font-mono mt-1">
                    Member since January 2024 • Last active today
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white border border-[#E8E8E4] p-5 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                            </svg>
                            <span className="text-[9px] text-green-600 font-mono">{stat.change}</span>
                        </div>
                        <p className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A56] font-mono mb-1">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-mono text-black">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders Trend */}
                <div className="bg-white border border-[#E8E8E4] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black">Orders Trend</h3>
                        <select className="text-[9px] font-mono bg-transparent border border-[#E8E8E4] px-2 py-1">
                            <option>Last 12 Months</option>
                            <option>Last 6 Months</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <Line data={lineChartData} options={chartOptions} />
                    </div>
                </div>

                {/* Revenue Trend */}
                <div className="bg-white border border-[#E8E8E4] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black">Revenue Trend</h3>
                        <select className="text-[9px] font-mono bg-transparent border border-[#E8E8E4] px-2 py-1">
                            <option>Last 12 Months</option>
                            <option>Last 6 Months</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64">
                        <Line data={revenueChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Distribution */}
                <div className="bg-white border border-[#E8E8E4] p-5">
                    <h3 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black mb-4">Fabric Preferences</h3>
                    <div className="h-52">
                        <Doughnut
                            data={categoryChartData}
                            options={{
                                ...chartOptions,
                                cutout: "60%",
                                plugins: {
                                    ...chartOptions.plugins,
                                    legend: { position: "bottom", labels: { font: { size: 9 }, color: "#5A5A56" } },
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white border border-[#E8E8E4] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black">Recent Orders</h3>
                        <button className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] hover:text-black transition">
                            View All →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {recentOrders.slice(0, 4).map((order) => (
                            <div key={order.id} className="flex items-center justify-between py-3 border-b border-[#F2F2F0] last:border-0">
                                <div>
                                    <p className="text-[12px] font-mono text-black">{order.id}</p>
                                    <p className="text-[9px] text-[#5A5A56] font-mono">{order.date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[12px] font-mono text-black">AED {order.total.toLocaleString()}</span>
                                    <StatusBadge status={order.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#F2F2F0] p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <p className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A56] font-mono">Need inspiration?</p>
                    <p className="text-[13px] text-black mt-1">Explore our curated collections and find your perfect fabric.</p>
                </div>
                <button className="text-[10px] tracking-[0.2em] uppercase font-mono px-6 py-3 bg-black text-white hover:bg-[#1A1A1A] transition">
                    Shop Now →
                </button>
            </div>
        </div>
    );
};

// ─── Orders Content ───────────────────────────────────────────────────────
const OrdersContent = () => {
    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">Order History</h1>
                <p className="text-[11px] text-[#5A5A56] font-mono mt-1">View and track all your orders</p>
            </div>

            <div className="space-y-3">
                {recentOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-[#E8E8E4] p-5">
                        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                            <div>
                                <p className="text-[13px] font-mono text-black">{order.id}</p>
                                <p className="text-[10px] text-[#5A5A56] font-mono">{order.date}</p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-[#E8E8E4]">
                            <div>
                                <p className="text-[11px] text-[#5A5A56] font-mono">{order.items} items</p>
                                <p className="text-base font-mono text-black mt-1">AED {order.total.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="text-[10px] tracking-[0.16em] uppercase font-mono px-4 py-2 border border-black hover:bg-black hover:text-white transition">
                                    Track Order
                                </button>
                                <button className="text-[10px] tracking-[0.16em] uppercase font-mono px-4 py-2 border border-[#E8E8E4] hover:border-black transition">
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Wishlist Content ─────────────────────────────────────────────────────
const WishlistContent = () => {
    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">My Wishlist</h1>
                <p className="text-[11px] text-[#5A5A56] font-mono mt-1">{wishlistItems.length} saved items</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {wishlistItems.map((item) => (
                    <div key={item.id} className="bg-white border border-[#E8E8E4] overflow-hidden group">
                        <div className="aspect-square bg-[#F2F2F0] relative">
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                        </div>
                        <div className="p-4">
                            <h3 className="font-display text-sm tracking-tight text-black mb-1">{item.name}</h3>
                            <p className="text-[12px] font-mono text-black">AED {item.price.toLocaleString()}</p>
                            {!item.inStock && <p className="text-[8px] text-red-500 font-mono mt-1">Out of Stock</p>}
                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 text-[9px] tracking-[0.16em] uppercase font-mono py-2 bg-black text-white hover:opacity-80 transition">
                                    Move to Cart
                                </button>
                                <button className="text-[9px] tracking-[0.16em] uppercase font-mono px-3 border border-[#E8E8E4] hover:border-black transition">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Placeholder Components ───────────────────────────────────────────────
const SamplesContent = () => (
    <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">Fabric Samples</h1>
        <p className="text-[13px] text-[#5A5A56]">Track your sample requests here.</p>
        <div className="bg-white border border-[#E8E8E4] p-8 text-center">
            <p className="text-[11px] text-[#5A5A56] font-mono">No sample requests yet</p>
            <button className="mt-4 text-[10px] tracking-[0.2em] uppercase font-mono px-6 py-2 bg-black text-white hover:bg-[#1A1A1A] transition">
                Request a Sample
            </button>
        </div>
    </div>
);

const AddressesContent = () => (
    <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">Address Book</h1>
        <p className="text-[13px] text-[#5A5A56]">Manage your shipping addresses.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E8E8E4] p-5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] tracking-[0.18em] uppercase font-mono text-black">Home</span>
                    <span className="text-[8px] tracking-[0.16em] uppercase bg-black text-white px-2 py-0.5">Default</span>
                </div>
                <p className="text-[13px] text-black leading-relaxed">
                    45 Pearl Street, Al Safa<br />
                    Dubai, UAE
                </p>
                <div className="flex gap-3 mt-4 pt-3 border-t border-[#E8E8E4]">
                    <button className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] hover:text-black transition">Edit</button>
                    <button className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] hover:text-black transition">Delete</button>
                </div>
            </div>
            <button className="border-2 border-dashed border-[#E8E8E4] p-5 flex flex-col items-center justify-center gap-2 hover:border-black transition">
                <svg className="w-6 h-6 text-[#5A5A56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] tracking-[0.16em] uppercase font-mono text-[#5A5A56]">Add New Address</span>
            </button>
        </div>
    </div>
);

const PaymentsContent = () => (
    <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">Payment Methods</h1>
        <p className="text-[13px] text-[#5A5A56]">Manage your saved payment methods.</p>
        <div className="bg-white border border-[#E8E8E4] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-black rounded"></div>
                <div>
                    <p className="text-[12px] font-mono text-black">•••• 4242</p>
                    <p className="text-[9px] text-[#5A5A56] font-mono">Expires 12/26</p>
                </div>
            </div>
            <button className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] hover:text-black transition">Remove</button>
        </div>
        <button className="border-2 border-dashed border-[#E8E8E4] p-4 flex items-center justify-center gap-2 hover:border-black transition">
            <svg className="w-5 h-5 text-[#5A5A56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] tracking-[0.16em] uppercase font-mono text-[#5A5A56]">Add New Card</span>
        </button>
    </div>
);

const ReviewsContent = () => (
    <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">My Reviews</h1>
        <p className="text-[13px] text-[#5A5A56]">View and manage your product reviews.</p>
        <div className="bg-white border border-[#E8E8E4] p-5">
            <div className="flex gap-4">
                <div className="w-16 h-16 bg-[#F2F2F0] shrink-0"></div>
                <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <h4 className="font-display text-sm text-black">Royal Gold Damask</h4>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className="w-3 h-3 fill-black" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                            ))}
                        </div>
                    </div>
                    <p className="text-[11px] text-[#5A5A56] leading-relaxed">Absolutely beautiful fabric! The quality is exceptional.</p>
                    <button className="mt-2 text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] hover:text-black transition">Edit Review</button>
                </div>
            </div>
        </div>
    </div>
);

const SettingsContent = () => (
    <div className="space-y-6">
        <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-black">Account Settings</h1>
        <div className="max-w-2xl space-y-6">
            <div className="bg-white border border-[#E8E8E4] p-5">
                <h2 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black mb-4">Personal Information</h2>
                <div className="space-y-4">
                    <div><label className="text-[9px] tracking-[0.14em] uppercase font-mono text-[#5A5A56]">Full Name</label><p className="text-[13px] text-black mt-1">Sarah Al Maktoum</p></div>
                    <div><label className="text-[9px] tracking-[0.14em] uppercase font-mono text-[#5A5A56]">Email Address</label><p className="text-[13px] text-black mt-1">sarah@example.com</p></div>
                    <div><label className="text-[9px] tracking-[0.14em] uppercase font-mono text-[#5A5A56]">Phone Number</label><p className="text-[13px] text-black mt-1">+971 50 123 4567</p></div>
                    <button className="text-[9px] tracking-[0.16em] uppercase font-mono text-black hover:opacity-50 transition">Edit Profile →</button>
                </div>
            </div>
            <div className="bg-white border border-[#E8E8E4] p-5">
                <h2 className="text-[11px] tracking-[0.18em] uppercase font-mono text-black mb-4">Preferences</h2>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" defaultChecked className="w-3.5 h-3.5 border border-[#E8E8E4] accent-black" /><span className="text-[11px] text-black">Email updates about new collections</span></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" defaultChecked className="w-3.5 h-3.5 border border-[#E8E8E4] accent-black" /><span className="text-[11px] text-black">Exclusive offers and promotions</span></label>
                </div>
            </div>
        </div>
    </div>
);

// ─── Component Map ────────────────────────────────────────────────────────
const componentMap: Record<TabId, React.ComponentType> = {
    overview: OverviewContent,
    orders: OrdersContent,
    wishlist: WishlistContent,
    samples: SamplesContent,
    addresses: AddressesContent,
    payments: PaymentsContent,
    reviews: ReviewsContent,
    settings: SettingsContent,
};

// ─── Main Dashboard Component ─────────────────────────────────────────────
export default function OverviewClient() {
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const ActiveComponent = componentMap[activeTab];

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#FFFDF9]">
            {/* Mobile Header */}
            <div className="lg:hidden sticky top-0 z-40 bg-[#FFFDF9] border-b border-[#E8E8E4] px-4 py-3 flex items-center justify-between">
                <h1 className="font-display text-lg tracking-tight text-black">
                    {navigationItems.find(item => item.id === activeTab)?.label}
                </h1>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 hover:opacity-50 transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {mobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
            fixed lg:sticky top-0 left-0 z-30 h-screen w-72 bg-white border-r border-[#E8E8E4]
            transform transition-transform duration-300 ease-out overflow-y-auto
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
                >
                    {/* Logo */}
                    <div className="p-6 border-b border-[#E8E8E4]">
                        <img
                            src="/PNG/Black/MOTD_Wordmark_Black.png"
                            alt="MOTD"
                            className="h-5 w-auto object-contain"
                        />
                        <p className="text-[10px] tracking-[0.18em] uppercase text-[#5A5A56] font-mono mt-3">
                            Customer Dashboard
                        </p>
                    </div>

                    {/* Navigation */}
                    <nav className="p-4 space-y-1">
                        {navigationItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setMobileMenuOpen(false);
                                }}
                                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200
                  ${activeTab === item.id
                                        ? "bg-black text-white"
                                        : "text-[#5A5A56] hover:bg-[#F2F2F0] hover:text-black"
                                    }
                `}
                            >
                                <svg
                                    className="w-4 h-4 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                </svg>
                                <span className="text-[11px] tracking-[0.14em] uppercase font-mono flex-1 text-left">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>

                    {/* Logout Button */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E8E8E4] bg-white">
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[#5A5A56] hover:bg-[#F2F2F0] hover:text-black transition-all duration-200">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-[11px] tracking-[0.14em] uppercase font-mono">Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-hidden">
                    <ActiveComponent />
                </main>
            </div>
        </div>
    );
}