"use client";

import CustomerSettings from "@/components/account/CustomerSettings";
import { useAuth } from "@/context/AuthContext";

export default function TailorSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
        <CustomerSettings
          hasPassword={user?.hasPassword === true}
          nextPath="/tailor/settings"
        />
      </div>
    </div>
  );
}
