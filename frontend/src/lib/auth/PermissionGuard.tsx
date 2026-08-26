// components/PermissionGuard.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";
import {
  hasAdminPerm,
  isFullAdmin,
  type AdminPermKey,
} from "@/lib/auth/adminAccess";

export default function PermissionGuard({
  children,
  requiredPerm,
}: {
  children: React.ReactNode;
  requiredPerm: string;
}) {
  const { user } = useAuth();
  if (!user) return null;

  if (requiredPerm === "subAdmins") {
    if (isFullAdmin(user)) return <>{children}</>;
  } else if (hasAdminPerm(user, requiredPerm as AdminPermKey)) {
    return <>{children}</>;
  } else if (
    !requiredPerm &&
    (user.role === "admin" || user.role === "sub-admin")
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center p-4 min-h-[calc(100dvh-10rem)]">
      <div className="py-10 relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
        <div className="absolute inset-0 bg-linear-to-br from-black/5 to-white/5 pointer-events-none"></div>
        <div className="relative z-10 text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/10 backdrop-blur-md flex items-center justify-center border border-black/20">
            <Lock className="w-8 h-8 text-black/60" />
          </div>
          <h3 className="text-xl font-light text-black/90 tracking-wide">
            Access Restricted
          </h3>
          <p className="text-sm text-black/60 mt-2 max-w-sm">
            You don&apos;t have permission to view this section. Please contact
            your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
