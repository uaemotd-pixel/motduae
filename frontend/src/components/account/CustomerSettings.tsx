"use client";

import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import { Eye, EyeOff, Save, Ruler, Lock, Check, Mail, Edit } from "lucide-react";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import { canChangeAccountEmail } from "@/lib/auth/emailVerification";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getTranslation } from "@/lib/getTranslation";

type CustomerSettingsProps = {
  hasPassword?: boolean;
};

type MeasurementUnit = "meters" | "wara";

export default function CustomerSettings({
  hasPassword = true,
}: CustomerSettingsProps) {
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const tVerify = getTranslation(locale).verifyEmail;
  const canChangeEmail = canChangeAccountEmail(user);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [measurementUnit, setMeasurementUnit] =
    useState<MeasurementUnit>("meters");
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get<{ measurementUnit: MeasurementUnit }>(
          "/api/customer/customerSettings",
        );
        if (res.measurementUnit) {
          setMeasurementUnit(res.measurementUnit);
        }
      } catch {
        // Silently fall back to default
      }
    };
    fetchSettings();
  }, []);

  const handleUnitChange = async (unit: MeasurementUnit) => {
    setIsSavingUnit(true);
    try {
      await api.put("/api/customer/customerSettings", {
        measurementUnit: unit,
      });
      setMeasurementUnit(unit);
      toast.success(`Measurement unit updated to ${unit}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update measurement unit.";
      toast.error(message);
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationMessage = getPasswordValidationMessage(password);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (hasPassword && !currentPassword) {
      toast.error("Current password is required.");
      return;
    }

    setIsLoading(true);
    try {
      await api.put("/api/users/change-password", {
        currentPassword: hasPassword ? currentPassword : undefined,
        password,
      });
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update password.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showChangeEmail && canChangeEmail) {
    return (
      <div className="mx-auto px-4 sm:px-6">
        <PartnerChangeEmailCard
          locale={locale}
          nextPath="/account?tab=settings"
          currentEmail={user?.email}
          onCancel={() => setShowChangeEmail(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-8 px-4 sm:px-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-light text-black tracking-tight">
          Settings
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage your account settings
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {/* Measurement Unit Section */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start sm:items-center gap-3">
            <Ruler
              className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 sm:mt-0"
              strokeWidth={1.5}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-black">
                Measurement Unit
              </h3>
              <p className="text-sm text-gray-500">
                Choose your preferred unit for fabric measurements
              </p>
            </div>
          </div>

          <div className="mt-4 sm:ml-10">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 hover:cursor-pointer">
                <input
                  type="radio"
                  name="measurementUnit"
                  value="meters"
                  checked={measurementUnit === "meters"}
                  onChange={() => handleUnitChange("meters")}
                  disabled={isSavingUnit}
                  className="w-4 h-4 accent-black hover:cursor-pointer shrink-0"
                />
                <span
                  className={
                    measurementUnit === "meters" ? "font-medium text-black" : ""
                  }
                >
                  Meters
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 hover:cursor-pointer">
                <input
                  type="radio"
                  name="measurementUnit"
                  value="wara"
                  checked={measurementUnit === "wara"}
                  onChange={() => handleUnitChange("wara")}
                  disabled={isSavingUnit}
                  className="w-4 h-4 accent-black hover:cursor-pointer shrink-0"
                />
                <span
                  className={
                    measurementUnit === "wara" ? "font-medium text-black" : ""
                  }
                >
                  War
                </span>
              </label>
              {isSavingUnit && (
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  Saving...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Change email */}
        {canChangeEmail ? (
          <div className="p-4 sm:p-6 space-y-4">
            <EmailChangePendingBanner
              locale={locale}
              nextPath="/account?tab=settings"
              variant="account"
            />
            <div className="flex items-start sm:items-center gap-3">
              <Mail
                className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 sm:mt-0"
                strokeWidth={1.5}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-black">
                  {tVerify.changeEmailHeading}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeEmail(true)}
                aria-label={tVerify.changeEmailHeading}
                className="shrink-0 p-1 rounded border border-black text-black bg-transparent hover:bg-black hover:text-white transition cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Password Section */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start sm:items-center gap-3">
            <Lock
              className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 sm:mt-0"
              strokeWidth={1.5}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-black">
                {hasPassword ? "Change Password" : "Set Password"}
              </h3>
              <p className="text-sm text-gray-500">
                {hasPassword
                  ? "Update your account password"
                  : "Set a password to sign in with email"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 sm:ml-10 space-y-4">
            {hasPassword && (
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="settings-new-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="settings-new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    placeholder="Enter new password"
                  />
                </div>
                {password && (
                  <div className="mt-3 sm:col-span-2">
                    <PasswordChecklist password={password} />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="settings-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                    placeholder="Confirm new password"
                  />
                  {confirmPassword && password === confirmPassword && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {password && (
              <div className="sm:hidden">
                <PasswordChecklist password={password} />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 hover:cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 accent-black hover:cursor-pointer shrink-0"
                />
                Show passwords
              </label>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid(password)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800 transition hover:cursor-pointer min-w-36 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
