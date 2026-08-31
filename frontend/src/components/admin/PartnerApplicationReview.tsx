"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";
import { Link } from "@/i18n/navigation";
import { getEmirateAr, getEmirateEn } from "@/lib/uaeAddress";
import {
  normalizeSocialLinks,
  type PartnerApplication,
} from "@/lib/partnerApplication";

type PartnerKind = "tailor" | "fabric_store";

type ShopSnapshot = {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  phone: string;
  city: string;
  location: string;
  logo: string;
  coverImage: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  pickupAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    emirate: string;
  };
  updatedAt: string | null;
};

type AdminApplicationResponse = {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    approvalStatus: string;
    applicationSubmittedAt: string | null;
    requestNumber?: string;
    rejectionNote: string;
    approvalNote: string;
    createdAt: string;
  };
  application: PartnerApplication | null;
  shop: ShopSnapshot | null;
  legacy: boolean;
};

function ExternalLink({ href, label }: { href: string; label: string }) {
  if (!href) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-black underline break-all"
    >
      {label || href}
    </a>
  );
}

function Pair({
  enLabel,
  arLabel,
  en,
  ar,
}: {
  enLabel: string;
  arLabel: string;
  en: string;
  ar: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
          {enLabel}
        </p>
        <p className="text-sm text-black whitespace-pre-wrap">{en || "—"}</p>
      </div>
      <div dir="rtl">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
          {arLabel}
        </p>
        <p className="text-sm text-black whitespace-pre-wrap">{ar || "—"}</p>
      </div>
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
        {label}
      </p>
      <div className="text-sm text-black whitespace-pre-wrap break-all">
        {children || "—"}
      </div>
    </div>
  );
}

function ShopProfileReadout({
  shop,
}: {
  shop: ShopSnapshot;
}) {
  const logoSrc = shop.logo ? resolveMediaUrl(shop.logo) : "";
  const coverSrc = shop.coverImage ? resolveMediaUrl(shop.coverImage) : "";
  const pickup = shop.pickupAddress;
  const emirate = pickup?.emirate
    ? `${getEmirateEn(pickup.emirate)} / ${getEmirateAr(pickup.emirate)}`
    : "";
  const pickupPhone = pickup?.phone
    ? pickup.phone.startsWith("+")
      ? pickup.phone
      : `+971 ${pickup.phone}`
    : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-8">
      <p className="text-sm text-gray-500">
        Live shop profile
      </p>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">
          Shop identity
        </p>
        <Pair
          enLabel="Shop name (EN)"
          arLabel="Shop name (AR)"
          en={shop.name}
          ar={shop.nameAr}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Labeled label="URL slug">{shop.slug || "—"}</Labeled>
          <Labeled label="Status">{shop.isActive ? "Active" : "Inactive"}</Labeled>
          <Labeled label="Rating">
            {shop.reviewCount
              ? `${shop.rating} (${shop.reviewCount} reviews)`
              : "—"}
          </Labeled>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">
          About your shop
        </p>
        <Pair
          enLabel="Description (EN)"
          arLabel="Description (AR)"
          en={shop.description}
          ar={shop.descriptionAr}
        />
      </div>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">
          Images
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
              Shop logo
            </p>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-20 w-20 object-cover border border-gray-200"
              />
            ) : (
              <p className="text-sm text-gray-400">No logo</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
              Cover image
            </p>
            {coverSrc ? (
              <img
                src={coverSrc}
                alt=""
                className="h-28 w-full max-w-sm object-cover border border-gray-200"
              />
            ) : (
              <p className="text-sm text-gray-400">No cover image</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">
          Location & contact
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Labeled label="City">{shop.city || "—"}</Labeled>
          <Labeled label="Address / area">{shop.location || "—"}</Labeled>
          <Labeled label="Phone">{shop.phone || "—"}</Labeled>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400">
          Courier pickup address
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Labeled label="Contact name">{pickup?.fullName || "—"}</Labeled>
          <Labeled label="Pickup phone">{pickupPhone || "—"}</Labeled>
          <Labeled label="Emirate">{emirate || "—"}</Labeled>
          <Labeled label="Pickup city">{pickup?.city || "—"}</Labeled>
          <Labeled label="Address line 1">{pickup?.line1 || "—"}</Labeled>
          <Labeled label="Address line 2">{pickup?.line2 || "—"}</Labeled>
        </div>
      </div>
    </div>
  );
}

export default function PartnerApplicationReview({
  kind,
}: {
  kind: PartnerKind;
}) {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const backHref = kind === "tailor" ? "/admin/tailors" : "/admin/partners";
  const apiBase =
    kind === "tailor"
      ? `/api/admin/tailors/${id}`
      : `/api/admin/fabric-stores/${id}`;

  const [data, setData] = useState<AdminApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [reviewTab, setReviewTab] = useState<"shop" | "application">(
    "application",
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminApplicationResponse>(`${apiBase}/application`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setApprovalNote(res.user.approvalNote || "");
          setRejectNote(res.user.rejectionNote || "");
          setReviewTab(
            res.user.approvalStatus === "approved" ? "shop" : "application",
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load application"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const decide = async (action: "approve" | "reject") => {
    if (action === "reject" && !rejectNote.trim()) {
      toast.error("A rejection note is required");
      return;
    }
    setBusy(action);
    try {
      if (action === "approve") {
        await api.patch(`${apiBase}/approve`, { approvalNote });
        toast.success("Approved");
      } else {
        await api.patch(`${apiBase}/reject`, {
          note: rejectNote.trim(),
          rejectionNote: rejectNote.trim(),
        });
        toast.success("Rejected");
      }
      router.push(backHref);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save decision"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading application…</p>;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || "Not found"}</p>
        <Link href={backHref} className="text-sm underline">
          Back to queue
        </Link>
      </div>
    );
  }

  const app = data.application;
  const status = data.user.approvalStatus;
  const canDecide = status === "pending" || status === "rejected";
  const requestNumber =
    app?.requestNumber || data.user.requestNumber || "";
  const resubmitted = (app?.resubmitCount || 0) > 0;
  const previousDecision =
    status === "pending" && data.user.rejectionNote
      ? data.user.rejectionNote
      : "";
  const logoSrc = app?.logoUrl ? resolveMediaUrl(app.logoUrl) : "";
  const shop = data.shop;
  const licenceSrc = app?.licenceFileUrl
    ? resolveMediaUrl(app.licenceFileUrl)
    : "";
  const licenceIsPdf = (app?.licenceFileUrl || "").toLowerCase().includes(".pdf");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400">
            {kind === "tailor" ? "Tailor application" : "Fabric store application"}
          </p>
          <h1 className="text-2xl font-light text-black mt-1">
            {data.user.name}
          </h1>
          <p className="text-sm text-gray-500">{data.user.email}</p>
        </div>
        <Link
          href={backHref}
          className="text-sm text-gray-600 hover:text-black underline"
        >
          Back to queue
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Status
            </p>
            <p className="text-sm capitalize text-black">{status}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Request number
            </p>
            <p className="text-sm text-black">{requestNumber || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Queue
            </p>
            <p className="text-sm text-black">
              {resubmitted ? "Resubmitted" : "—"}
            </p>
          </div>
        </div>
      </div>

      {status === "approved" && data.user.approvalNote ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Approval note
          </p>
          <p className="text-sm text-black whitespace-pre-wrap">
            {data.user.approvalNote}
          </p>
        </div>
      ) : null}

      {previousDecision ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Previous decision
          </p>
          <p className="text-sm text-black whitespace-pre-wrap">
            {previousDecision}
          </p>
        </div>
      ) : null}

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 sm:gap-8 overflow-x-auto">
          <button
            type="button"
            onClick={() => setReviewTab("shop")}
            className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-all hover:cursor-pointer ${
              reviewTab === "shop"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black hover:border-gray-300"
            }`}
          >
            Current shop
          </button>
          <button
            type="button"
            onClick={() => setReviewTab("application")}
            className={`pb-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-all hover:cursor-pointer ${
              reviewTab === "application"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black hover:border-gray-300"
            }`}
          >
            Submitted application
          </button>
        </nav>
      </div>

      {reviewTab === "shop" ? (
        shop ? (
          <ShopProfileReadout shop={shop} />
        ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm text-gray-600">
            No shop profile yet. A shop is created when you Approve.
          </p>
        </div>
        )
      ) : (
        <>
      {app ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Partner comments
          </p>
          <p className="text-sm text-black whitespace-pre-wrap">
            {app.partnerNote || "—"}
          </p>
        </div>
      ) : null}

      {data.legacy || !app ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-sm text-gray-600">
            Legacy account — no application on file
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-8">
          <p className="text-sm text-gray-500">
            Snapshot from the last submit. It does not change when the partner
            edits their shop.
          </p>
          <Pair
            enLabel="Business name (EN)"
            arLabel="Business name (AR)"
            en={app.businessName}
            ar={app.businessNameAr}
          />
          <Pair
            enLabel="About (EN)"
            arLabel="About (AR)"
            en={app.about}
            ar={app.aboutAr}
          />
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">
              Location
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  City
                </p>
                <p>{app.city || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  Address / area
                </p>
                <p>{app.location || "—"}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Phone
              </p>
              <p>{app.phone || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Years operating
              </p>
              <p>{app.yearsOperating || "—"}</p>
            </div>
          </div>
          {kind === "tailor" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  Make time
                </p>
                <p>{app.makeTime || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  Work setup
                </p>
                <p>{app.workSetup || "—"}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Offering
              </p>
              <p className="text-sm">{app.offering || "—"}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">
              Logo
            </p>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-20 w-20 object-cover border border-gray-200"
              />
            ) : (
              <p className="text-sm text-gray-400">No logo</p>
            )}
          </div>
          <div className="space-y-2 text-sm min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">
              Links
            </p>
            <p className="break-all">
              Website: <ExternalLink href={app.website} label={app.website} />
            </p>
            {(normalizeSocialLinks(app.social).length === 0) ? (
              <p className="text-gray-400">No social links</p>
            ) : (
              normalizeSocialLinks(app.social).map((link, index) => (
                <p key={`${link.name}-${index}`} className="break-all">
                  {link.name || "Social"}:{" "}
                  <ExternalLink href={link.url} label={link.url} />
                </p>
              ))
            )}
          </div>
          <div className="text-sm space-y-2">
            <p>
              Licence number: {app.licenceNumber || "—"}
            </p>
            {licenceSrc ? (
              licenceIsPdf ? (
                <ExternalLink href={licenceSrc} label="Licence PDF" />
              ) : (
                <a
                  href={licenceSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={licenceSrc}
                    alt="Licence"
                    className="h-28 object-contain border border-gray-200"
                  />
                </a>
              )
            ) : (
              <p className="text-gray-400">No licence file</p>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {canDecide ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-medium">Decision</h2>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Approval note (optional, admin only)
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
              Rejection note (required to reject)
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void decide("approve")}
              className="px-4 py-2 bg-black text-white text-sm rounded-lg disabled:opacity-50"
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
            {status === "pending" ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void decide("reject")}
                className="px-4 py-2 border border-red-600 text-red-600 text-sm rounded-lg disabled:opacity-50"
              >
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
