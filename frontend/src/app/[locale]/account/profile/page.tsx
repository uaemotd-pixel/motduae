// components/account/ProfileTab.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { User, Mail, Phone, MapPin, Calendar, Users, Edit } from "lucide-react";
import { resolveMediaUrl } from "@/lib/media";

interface ProfileTabProps {
  onEditClick?: () => void;
}

// Updated Address type to match new customer address schema
type Address = {
  _id?: string;
  label?: "home" | "work" | "other";
  fullName: string; // now required
  phone: string; // now required
  emirate: string; // was "state"
  city: string;
  street: string;
  building: string;
  postalCode: string;
  isDefault?: boolean;
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

// Helper: calculate age from DOB
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

// Completeness check: requires phone, gender (not "prefer-not"), DOB, and address with city & street
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

export default function ProfileTab({ onEditClick }: ProfileTabProps) {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isComplete = profile ? isProfileComplete(profile) : false;

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
        // data may have _id; map to id
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
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        <span className="ml-3">Loading…</span>
      </div>
    );
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

  const defaultAddress =
    profile.addresses?.find((a) => a.isDefault) || profile.addresses?.[0];

  // DisplayField component
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
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <div
          className={`w-full ${icon ? "pl-9" : "pl-4"} pr-4 py-2.5 
          border border-transparent rounded-xl bg-transparent text-gray-800 font-medium`}
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

  // Compute age for display
  const age = profile.dob ? getAge(profile.dob) : null;
  const dobDisplay = profile.dob
    ? `${formatDate(profile.dob)}${age !== null ? ` (${age} years)` : ""}`
    : undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-md">
                {profile.profilePic ? (
                  <img
                    src={resolveMediaUrl(profile.profilePic)}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl md:text-4xl font-medium text-gray-500">
                    {profile.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
            </div>

            {/* Name + Badge + Email/Phone */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 truncate">
                  {profile.name}
                </h3>
                {isComplete ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 shrink-0">
                    Incomplete
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {authUser?.email || "No email"}
                </span>
              </p>
              {profile.phone && (
                <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{profile.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={onEditClick}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 transition flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Edit className="w-4 h-4" />
            {isComplete ? "Edit Profile" : "Complete Profile"}
          </button>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Personal Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <DisplayField
            label="Full Name"
            value={profile.name}
            icon={<User className="w-4 h-4" />}
          />
          <DisplayField
            label="Phone"
            value={profile.phone}
            icon={<Phone className="w-4 h-4" />}
          />
          <DisplayField
            label="Gender"
            value={genderDisplay(profile.gender)}
            icon={<Users className="w-4 h-4" />}
          />
          <DisplayField
            label="Date of Birth"
            value={dobDisplay}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Address – updated to match new schema */}
        <div className="mt-6 sm:mt-8">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5" />
            Default Address
          </h4>
          {defaultAddress ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <DisplayField label="Full Name" value={defaultAddress.fullName} />
              <DisplayField label="Phone" value={defaultAddress.phone} />
              <DisplayField label="Emirate" value={defaultAddress.emirate} />
              <DisplayField label="City" value={defaultAddress.city} />
              <DisplayField label="Street" value={defaultAddress.street} />
              <DisplayField label="Building" value={defaultAddress.building} />
              <DisplayField
                label="Postal Code"
                value={defaultAddress.postalCode}
              />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No address added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
