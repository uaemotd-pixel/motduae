"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";

type ChangePasswordFormProps = {
  hasPassword?: boolean;
};

export default function ChangePasswordForm({
  hasPassword = true,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-1">Change password</h3>
        <p className="text-sm text-gray-500">
          {hasPassword
            ? "Update your account password."
            : "Set a password so you can also sign in with email."}
        </p>
      </div>

      {hasPassword && (
        <div className="space-y-1">
          <label htmlFor="current-password" className="text-sm font-medium">
            Current password
          </label>
          <input
            id="current-password"
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="settings-new-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="settings-new-password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <PasswordChecklist password={password} />
      </div>

      <div className="space-y-1">
        <label htmlFor="settings-confirm-password" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="settings-confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        Show passwords
      </label>

      <button
        type="submit"
        disabled={isLoading || !isPasswordValid(password)}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isLoading ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
