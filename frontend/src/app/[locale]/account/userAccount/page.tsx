"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { User, Mail, Save, Edit2, X } from "lucide-react";

// Mock API – replace with real endpoint
const updateUserProfile = async (userId: string, data: { name: string; email: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { success: true, user: { id: userId, ...data } };
};

export default function AccountPage() {
    const { user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "" });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Pre-fill form when user data is loaded
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
            });
        }
    }, [user]);

    // Redirect if not authenticated (after loading finishes)
    // useEffect(() => {
    //     if (!authLoading && !user) {
    //         router.push("/login?redirect=/account");
    //     }
    // }, [authLoading, user, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const result = await updateUserProfile(user.id, formData);
            if (result.success) {
                setIsEditing(false);
            } else {
                setSaveError("Failed to update profile. Please try again.");
            }
        } catch (error) {
            console.error(error);
            setSaveError("Failed to update profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        if (user) {
            setFormData({ name: user.name || "", email: user.email || "" });
        }
        setSaveError(null);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto"></div>
                    <p className="mt-4 font-['TT_Norms_Pro'] text-black">Loading account...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }



    return (
        <div className="min-h-screen bg-gray-50 py-8 md:py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8 border-b border-gray-200 pb-4">
                    <h1 className="text-3xl md:text-4xl font-['Ivy_Ora'] text-black tracking-tight">
                        My Account
                    </h1>
                    <p className="text-gray-500 font-['TT_Norms_Pro'] mt-2">
                        Manage your personal information and orders
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Profile Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-['TT_Norms_Pro_Mono'] text-black tracking-wide">
                                    Personal Information
                                </h2>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors duration-200 font-['TT_Norms_Pro'] text-sm"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={cancelEdit}
                                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-500 hover:border-black transition-colors font-['TT_Norms_Pro'] text-sm"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSaving}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-['TT_Norms_Pro'] text-sm"
                                        >
                                            <Save className="w-4 h-4" />
                                            {isSaving ? "Saving..." : "Save changes"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {saveError && (
                                <div className="mb-4 p-3 border border-red-500 bg-red-50 text-red-700 text-sm font-['TT_Norms_Pro']">
                                    {saveError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-['TT_Norms_Pro_Mono'] text-black mb-2">
                                        Full name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-200 bg-white text-black focus:outline-none focus:border-black transition-colors font-['TT_Norms_Pro']"
                                            required
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-black font-['TT_Norms_Pro'] py-2">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span>{user.name || "Not provided"}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-['TT_Norms_Pro_Mono'] text-black mb-2">
                                        Email address
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-200 bg-white text-black focus:outline-none focus:border-black transition-colors font-['TT_Norms_Pro']"
                                            required
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-black font-['TT_Norms_Pro'] py-2">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <span>{user.email}</span>
                                        </div>
                                    )}
                                </div>

                                {!isEditing && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-sm text-gray-500 font-['TT_Norms_Pro']">
                                            Click 'Edit' to update your name or email.
                                        </p>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Sidebar: Order Summary / Quick Links */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-gray-200 p-6">
                            <h3 className="text-lg font-['TT_Norms_Pro_Mono'] text-black mb-4 tracking-wide">
                                Recent orders
                            </h3>
                            <div className="space-y-3">
                                <p className="text-gray-500 font-['TT_Norms_Pro'] text-sm">
                                    You haven't placed any orders yet.
                                </p>
                                <button
                                    disabled
                                    className="w-full mt-4 px-4 py-2 border border-gray-200 text-gray-500 text-sm font-['TT_Norms_Pro'] cursor-not-allowed"
                                >
                                    View all orders
                                </button>
                            </div>
                        </div>

                        {/* Additional account actions */}
                        <div className="mt-6 bg-white border border-gray-200 p-6">
                            <h3 className="text-lg font-['TT_Norms_Pro_Mono'] text-black mb-4 tracking-wide">
                                Account actions
                            </h3>
                            <button
                                onClick={() => {
                                    logout();
                                    router.push("/auth/login");
                                }}
                                className="w-full px-4 py-2 bg-transparent border border-black text-black hover:bg-black hover:text-white transition-colors font-['TT_Norms_Pro'] text-sm"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}