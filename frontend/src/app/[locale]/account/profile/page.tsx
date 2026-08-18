// components/account/ProfileTab.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { getTranslation } from "@/lib/getTranslation";
import { canChangeAccountEmail } from "@/lib/auth/emailVerification";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Edit,
  MapPinned,
  Building2,
  Road,
  House,
  Mailbox,
  Ruler,
  UserPen,
  Maximize2,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";
import { useParams } from "next/navigation";
import { ImageModal } from "@/components/shared/ImageModal";
import { AccountPanelSkeleton } from "@/components/ui/Skeleton";

const ACCOUNT_VERIFY_HREF = (locale: string) =>
  `/${locale}/auth/verify-email?mode=account&next=${encodeURIComponent("/account?tab=profile")}`;

interface ProfileTabProps {
  onEditClick?: () => void;
}

type Address = {
  _id?: string;
  label?: "home" | "work" | "other";
  fullName: string;
  phone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  isDefault?: boolean;
};

type Measurements = {
  totalLength?: number | null;
  shoulderWidth?: number | null;
  armLength?: number | null;
  chestWidth?: number | null;
  waist?: number | null;
  hips?: number | null;
  neckWidth?: number | null;
  neckDepth?: number | null;
  armholeHeight?: number | null;
  sleeveOpeningWidth?: number | null;
  cuffWidth?: number | null;
  cuffLength?: number | null;
  notes?: string;
};

type CustomerProfile = {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  dob?: string;
  profilePic?: string;
  gender?: "male" | "female" | "other" | "prefer-not";
  addresses?: Address[];
  defaultAddressId?: string;
};

function getAge(dob: string | Date): number | null {
  if (!dob) return null;
  const birth = typeof dob === "string" ? new Date(dob) : dob;
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const isProfileComplete = (profile: CustomerProfile): boolean => {
  if (!profile) return false;
  const hasPhone = !!profile.phone?.trim();
  const hasGender = !!profile.gender && profile.gender !== "prefer-not";
  const hasDob = !!profile.dob;
  const firstAddr = profile.addresses?.[0];
  const hasValidAddress =
    !!firstAddr?.city?.trim() && !!firstAddr?.street?.trim();
  return hasPhone && hasGender && hasDob && hasValidAddress;
};

const cmToInches = (cm: number | null | undefined): string => {
  if (cm === null || cm === undefined) return "—";
  return (Math.round((cm / 2.54) * 10) / 10).toFixed(1);
};

export default function ProfileTab({ onEditClick }: ProfileTabProps) {
  const { user: authUser } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslation(locale).verifyEmail;
  const showVerify = needsEmailVerification(authUser) && !authUser?.isGuest;
  const canChangeEmail = canChangeAccountEmail(authUser);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const isComplete = profile ? isProfileComplete(profile) : false;

  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setImageModalOpen(true);
    }
  };

  useEffect(() => {
    async function fetchProfile() {
      if (!authUser) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);

        const data = await api.get("/api/customer/profile");
        const mapped: CustomerProfile = {
          id: data._id || data.id,
          userId: data.userId,
          name: data.name,
          phone: data.phone,
          dob: data.dob,
          profilePic: data.profilePic,
          gender: data.gender,
          addresses: data.addresses,
          defaultAddressId: data.defaultAddressId,
        };
        setProfile(mapped);

        try {
          const measurementsData = await api.get(
            "/api/customer/customer_measurements",
          );
          if (measurementsData.measurements) {
            setMeasurements(measurementsData.measurements);
          }
        } catch (measErr: any) {
          if (measErr.status !== 404) {
            console.warn("Failed to fetch measurements:", measErr);
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch profile:", err);
        if (err.status === 404) {
          setProfile({
            id: authUser.id,
            userId: authUser.id,
            name: authUser.name || "",
          });
          setError(null);
        } else {
          setError(err.message || "Could not load profile");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [authUser]);

  if (isLoading) {
    return <AccountPanelSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
        No profile data available.
      </div>
    );
  }

  if (showChangeEmail && canChangeEmail) {
    return (
      <PartnerChangeEmailCard
        locale={locale}
        nextPath="/account?tab=profile"
        currentEmail={authUser?.email}
        onCancel={() => setShowChangeEmail(false)}
      />
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatUAEPhone = (phone?: string | null): string => {
    if (!phone) return "—";
    const cleaned = phone.replace(/\D/g, "");
    let number = cleaned;
    if (number.startsWith("971")) {
      number = number.slice(3);
    }
    return `+971 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
  };

  const defaultAddress =
    profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];

  const DisplayField = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value?: string | null;
    icon?: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <div
          className={`w-full ${icon ? "pl-7 sm:pl-9" : "pl-3 sm:pl-4"} pr-3 sm:pr-4 py-2 sm:py-2.5 
          border border-transparent rounded-xl bg-transparent text-gray-800 font-medium text-sm sm:text-base`}
        >
          {value || "—"}
        </div>
      </div>
    </div>
  );

  const genderDisplay = (g?: string) => {
    if (!g || g === "prefer-not") return "Prefer not to say";
    return g.charAt(0).toUpperCase() + g.slice(1);
  };

  const age = profile.dob ? getAge(profile.dob) : null;
  const dobDisplay = profile.dob
    ? `${formatDate(profile.dob)}${age !== null ? ` (${age} years)` : ""}`
    : undefined;

  const measurementFields = [
    { key: "totalLength", label: "Total Length" },
    { key: "shoulderWidth", label: "Shoulder Width" },
    { key: "armLength", label: "Arm Length" },
    { key: "chestWidth", label: "Chest Width" },
    { key: "waist", label: "Waist" },
    { key: "hips", label: "Hips" },
    { key: "neckWidth", label: "Neck Width" },
    { key: "neckDepth", label: "Neck Depth" },
    { key: "armholeHeight", label: "Armhole Height" },
    { key: "sleeveOpeningWidth", label: "Sleeve Opening" },
    { key: "cuffWidth", label: "Cuff Width" },
    { key: "cuffLength", label: "Cuff Length" },
  ];

  const profilePicUrl = profile.profilePic
    ? resolveMediaUrl(profile.profilePic)
    : null;

  return (
    <div className="space-y-4">
      {canChangeEmail ? (
        <EmailChangePendingBanner
          locale={locale}
          nextPath="/account?tab=profile"
          variant="account"
        />
      ) : null}
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            {/* Avatar with click to enlarge */}
            <div className="relative group shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-md">
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-gray-500">
                    {profile.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
              {profilePicUrl && (
                <button
                  onClick={() => handleImageClick(profilePicUrl)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300 hover:cursor-pointer"
                >
                  <Maximize2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </button>
              )}
            </div>

            {/* Name + Badge + Email/Phone */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">
                  {profile.name}
                </h3>
                {isComplete ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 shrink-0">
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-yellow-100 text-yellow-800 shrink-0">
                    Incomplete
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-xs sm:text-sm flex items-center gap-2 mt-0.5 min-w-0 flex-wrap">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    {authUser?.email || "No email"}
                  </span>
                </span>
                {showVerify ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.assign(ACCOUNT_VERIFY_HREF(locale));
                    }}
                    className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                  >
                    {t.profileVerify}
                  </button>
                ) : null}
                {canChangeEmail ? (
                  <button
                    type="button"
                    onClick={() => setShowChangeEmail((open) => !open)}
                    aria-label={t.changeEmailHeading}
                    className="shrink-0 p-0.5 rounded border border-black text-black bg-transparent hover:bg-black hover:text-white transition cursor-pointer"
                  >
                    <Edit className="w-3 h-3" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              {profile.phone && (
                <p className="text-gray-500 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{formatUAEPhone(profile.phone)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={onEditClick}
            className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-black text-white hover:bg-gray-800 transition flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center hover:cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isComplete ? "Edit Profile" : "Complete Profile"}
          </button>
        </div>

        <hr className="my-4 sm:my-6 border-gray-200" />

        {/* Personal Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <DisplayField
            label="Full Name"
            value={profile.name}
            icon={<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          />
          <DisplayField
            label="Phone"
            value={formatUAEPhone(profile.phone)}
            icon={<Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          />
          <DisplayField
            label="Gender"
            value={genderDisplay(profile.gender)}
            icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          />
          <DisplayField
            label="Date of Birth"
            value={dobDisplay}
            icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          />
        </div>

        {/* Address */}
        <div className="mt-6 sm:mt-8">
          <h4 className="text-sm sm:text-md font-medium text-gray-700 flex items-center gap-2 mb-4 uppercase">
            <MapPin className="w-4 h-4" />
            Default Address
          </h4>
          {defaultAddress ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <DisplayField
                label="Full Name"
                value={defaultAddress.fullName}
                icon={<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="Phone"
                value={formatUAEPhone(defaultAddress.phone)}
                icon={<Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="Emirate"
                value={defaultAddress.emirate}
                icon={<MapPinned className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="City"
                value={defaultAddress.city}
                icon={<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="Street"
                value={defaultAddress.street}
                icon={<Road className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="Building"
                value={defaultAddress.building}
                icon={<House className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
              <DisplayField
                label="Postal Code"
                value={defaultAddress.postalCode}
                icon={<Mailbox className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No address added yet.</p>
          )}
        </div>

        {/* Measurements Section */}
        <div className="mt-6 sm:mt-8">
          <h4 className="text-sm sm:text-md font-medium text-gray-700 flex items-center gap-2 mb-4 uppercase">
            <UserPen className="w-4 h-4" />
            Body Measurements
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {measurementFields.map((field) => {
              const value = measurements?.[field.key as keyof Measurements];
              let displayValue: string = "—";

              if (value !== null && value !== undefined) {
                const numeric =
                  typeof value === "string" ? parseFloat(value) : value;
                if (!Number.isNaN(numeric as number)) {
                  displayValue = `${cmToInches(numeric as number)} in`;
                }
              }

              return (
                <DisplayField
                  key={field.key}
                  label={field.label}
                  value={displayValue}
                  icon={<Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                />
              );
            })}
            {measurements?.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <DisplayField
                  label="Notes"
                  value={measurements.notes}
                  icon={<MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Profile Picture"
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage("");
        }}
      />
    </div>
    </div>
  );
}
