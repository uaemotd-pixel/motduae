import type { User } from "@/context/AuthContext";

export type AdminPermKey =
  | "customers"
  | "readyMade"
  | "fabrics"
  | "tailors"
  | "orders"
  | "partners"
  | "settings"
  | "payments"
  | "addons"
  | "notifications";

export const ADMIN_PERM_KEYS: AdminPermKey[] = [
  "customers",
  "readyMade",
  "fabrics",
  "tailors",
  "orders",
  "partners",
  "settings",
  "payments",
  "addons",
  "notifications",
];

export const ADMIN_PERM_LABELS: Record<AdminPermKey, string> = {
  customers: "Customers",
  readyMade: "Ready-Made",
  fabrics: "Fabrics",
  tailors: "Tailors",
  orders: "Orders",
  partners: "Fabric Stores",
  settings: "Settings",
  payments: "Payments",
  addons: "Add-Ons",
  notifications: "Notifications",
};

export const emptyAdminPerms = (): Record<AdminPermKey, boolean> =>
  Object.fromEntries(ADMIN_PERM_KEYS.map((k) => [k, false])) as Record<
    AdminPermKey,
    boolean
  >;

export function isFullAdmin(user: User | null | undefined): boolean {
  return user?.role === "admin";
}

export function isStaffUser(user: User | null | undefined): boolean {
  return user?.role === "admin" || user?.role === "sub-admin";
}

export function hasAdminPerm(
  user: User | null | undefined,
  perm: AdminPermKey | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!perm) return user.role === "sub-admin" || user.role === "admin";
  if (user.role !== "sub-admin") return false;
  return user.perms?.[perm] === true;
}

/** Map an /admin frontend path (no locale) to a permission key. */
export function resolveAdminPagePerm(
  pathWithoutLocale: string,
): AdminPermKey | "subAdmins" | null {
  const path = pathWithoutLocale.split("?")[0] || "/admin";

  if (
    path === "/admin" ||
    path === "/admin/" ||
    path === "/admin/Dashboard" ||
    path.startsWith("/admin/Dashboard/")
  ) {
    return null;
  }

  if (path.startsWith("/admin/payments")) return "payments";
  if (path.startsWith("/admin/customers")) return "customers";
  if (path.startsWith("/admin/ready-made")) return "readyMade";
  if (path.startsWith("/admin/fabrics")) return "fabrics";
  if (path.startsWith("/admin/tailors")) return "tailors";
  if (path.startsWith("/admin/addons")) return "addons";
  if (path.startsWith("/admin/orders")) return "orders";
  if (path.startsWith("/admin/partners")) return "partners";
  if (path.startsWith("/admin/notifications")) return "notifications";
  if (path.startsWith("/admin/settings")) return "settings";
  if (path.startsWith("/admin/sub-admin")) return "subAdmins";

  return "subAdmins";
}
