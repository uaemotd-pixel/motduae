export type PartnerPortal = "tailor" | "fabric";

export type PartnerPortalUser = {
  role: string;
  approvalStatus?: string;
  applicationSubmittedAt?: string | null;
  isActive?: boolean;
};

export type PartnerPortalGate =
  | { screen: "empty" }
  | { screen: "redirect"; to: string }
  | { screen: "apply" }
  | { screen: "wait" }
  | { screen: "rejected" }
  | { screen: "dashboard" };

function applyPathFor(portal: PartnerPortal) {
  return portal === "fabric" ? "/fabric/apply" : "/tailor/apply";
}

function homePathFor(portal: PartnerPortal) {
  return portal === "fabric" ? "/fabric" : "/tailor";
}

function expectedRole(portal: PartnerPortal) {
  return portal === "fabric" ? "fabric_store" : "tailor";
}

export function isPartnerApplyPathname(pathname: string, portal: PartnerPortal) {
  return pathname.includes(applyPathFor(portal));
}

export function resolvePartnerPortalGate({
  portal,
  user,
  pathname,
  isDeactivated = false,
}: {
  portal: PartnerPortal;
  user: PartnerPortalUser | null | undefined;
  pathname: string;
  isDeactivated?: boolean;
}): PartnerPortalGate {
  const applyPath = applyPathFor(portal);
  const homePath = homePathFor(portal);
  const isApplyPath = isPartnerApplyPathname(pathname, portal);

  if (!user || user.role !== expectedRole(portal)) {
    return { screen: "empty" };
  }

  if (user.approvalStatus === "approved" && isApplyPath) {
    return { screen: "redirect", to: homePath };
  }

  const submitted = Boolean(user.applicationSubmittedAt);

  if (user.approvalStatus === "pending" && !submitted) {
    if (!isApplyPath) return { screen: "redirect", to: applyPath };
    return { screen: "apply" };
  }

  if (user.approvalStatus === "pending") {
    return { screen: "wait" };
  }

  if (portal === "fabric" && (user.isActive === false || isDeactivated)) {
    return { screen: "wait" };
  }

  if (user.approvalStatus === "rejected" && isApplyPath) {
    return { screen: "apply" };
  }

  if (user.approvalStatus === "rejected") {
    return { screen: "rejected" };
  }

  return { screen: "dashboard" };
}
