"use client";

import { useState } from "react";

// Your content components
const OverviewContent = () => <div>Overview Content</div>;
const OrdersContent = () => <div>Orders Content</div>;
const WishlistContent = () => <div>Wishlist Content</div>;

// Map of tab IDs to components
const TABS = {
    overview: { label: "Overview", component: OverviewContent },
    orders: { label: "Orders", component: OrdersContent },
    wishlist: { label: "Wishlist", component: WishlistContent },
} as const;

type TabId = keyof typeof TABS;

export default function ClientDashboardPage() {
    const [activeTab, setActiveTab] = useState<TabId>("overview");

    const ActiveComponent = TABS[activeTab].component;

    return (
        <div className="flex">
            <aside className="w-64">
                {Object.entries(TABS).map(([id, { label }]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id as TabId)}
                        className={`block w-full p-3 text-left ${activeTab === id ? "bg-black text-white" : "hover:bg-gray-100"
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </aside>

            <main className="flex-1 p-8">
                <ActiveComponent />
            </main>
        </div>
    );
}