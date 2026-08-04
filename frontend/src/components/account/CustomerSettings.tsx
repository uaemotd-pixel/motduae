"use client";

import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";

type CustomerSettingsProps = {
  hasPassword?: boolean;
};

type MeasurementUnit = "meters" | "wara";

export default function CustomerSettings({
  hasPassword = true,
}: CustomerSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [measurementUnit, setMeasurementUnit] =
    useState<MeasurementUnit>("meters");
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Fetch current measurement unit
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-light text-black tracking-tight">
          Settings
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage your account settings
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Measurement Unit */}
        <div>
          <h3 className="text-base font-semibold mb-1">Measurement Unit</h3>
          <p className="text-sm text-gray-500 mb-3">
            Choose your preferred unit for fabric measurements
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm hover:cursor-pointer">
              <input
                type="radio"
                name="measurementUnit"
                value="meters"
                checked={measurementUnit === "meters"}
                onChange={() => handleUnitChange("meters")}
                disabled={isSavingUnit}
                className="accent-black hover:cursor-pointer"
              />
              Meters
            </label>
            <label className="flex items-center gap-2 text-sm hover:cursor-pointer">
              <input
                type="radio"
                name="measurementUnit"
                value="wara"
                checked={measurementUnit === "wara"}
                onChange={() => handleUnitChange("wara")}
                disabled={isSavingUnit}
                className="accent-black hover:cursor-pointer"
              />
              Wara
            </label>
            {isSavingUnit && (
              <span className="text-sm text-gray-400">Saving...</span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="pb-2">
              <h3 className="text-base font-semibold mb-1">Change password</h3>
              <p className="text-sm text-gray-500">
                {hasPassword
                  ? "Update your account password."
                  : "Set a password so you can also sign in with email."}
              </p>
            </div>

            {hasPassword && (
              <div className="space-y-1">
                <label
                  htmlFor="current-password"
                  className="text-sm font-medium"
                >
                  Current password
                </label>
                <input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black transition"
                />
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="settings-new-password"
                className="text-sm font-medium"
              >
                New password
              </label>
              <input
                id="settings-new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black transition"
              />
              <PasswordChecklist password={password} />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="settings-confirm-password"
                className="text-sm font-medium"
              >
                Confirm new password
              </label>
              <input
                id="settings-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black transition"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 hover:cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="hover:cursor-pointer"
                />
                Show passwords
              </label>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid(password)}
                className="rounded-lg bg-black px-6 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800 transition hover:cursor-pointer"
              >
                {isLoading ? "Saving..." : "Save password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
