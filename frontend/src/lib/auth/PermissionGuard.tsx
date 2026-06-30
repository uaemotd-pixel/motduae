// components/PermissionGuard.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";

export default function PermissionGuard({
  children,
  requiredPerm,
}: {
  children: React.ReactNode;
  requiredPerm: string;
}) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") return <>{children}</>;
  if (user.perms && user.perms[requiredPerm] === true) return <>{children}</>;
  return (
    <>
      <div className="relative flex flex-1 items-center justify-center h-full min-h-[400px] overflow-hidden rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
        {/* subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-white/5 pointer-events-none"></div>

        <div className="relative z-10 text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/10 backdrop-blur-md flex items-center justify-center border border-black/20">
            <Lock className="w-8 h-8 text-black/60" />
          </div>
          <h3 className="text-xl font-light text-black/90 tracking-wide">
            Access Restricted
          </h3>
          <p className="text-sm text-black/60 mt-2 max-w-sm">
            You don't have permission to view this section. Please contact your
            administrator.
          </p>
        </div>
      </div>
    </>
  );
}
