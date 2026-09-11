"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import { Eye, EyeOff, Save, Lock, Check, Mail, Edit } from "lucide-react";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import { canChangeAccountEmail } from "@/lib/auth/emailVerification";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getTranslation } from "@/lib/getTranslation";

type CustomerSettingsProps = {
  hasPassword?: boolean;
  nextPath?: string;
};

export default function CustomerSettings({
  hasPassword = true,
  nextPath = "/account?tab=settings",
}: CustomerSettingsProps) {
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isAr = locale === "ar";
  const tVerify = getTranslation(locale).verifyEmail;
  const canChangeEmail = canChangeAccountEmail(user);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checklistLabels = isAr
    ? {
        minLength: "8 أحرف على الأقل",
        uppercase: "حرف كبير واحد",
        number: "رقم واحد",
        special: "رمز خاص واحد",
      }
    : undefined;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationMessage = getPasswordValidationMessage(password);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        isAr ? "كلمات المرور غير متطابقة." : "Passwords do not match.",
      );
      return;
    }

    if (hasPassword && !currentPassword) {
      toast.error(
        isAr ? "كلمة المرور الحالية مطلوبة." : "Current password is required.",
      );
      return;
    }

    setIsLoading(true);
    try {
      await api.put("/api/users/change-password", {
        currentPassword: hasPassword ? currentPassword : undefined,
        password,
      });
      toast.success(
        isAr
          ? "تم تحديث كلمة المرور بنجاح."
          : "Password updated successfully.",
      );
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : isAr
            ? "فشل في تحديث كلمة المرور."
            : "Failed to update password.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showChangeEmail && canChangeEmail) {
    return (
      <div>
        <PartnerChangeEmailCard
          locale={locale}
          nextPath={nextPath}
          currentEmail={user?.email}
          onCancel={() => setShowChangeEmail(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-light text-black tracking-tight">
          {isAr ? "الإعدادات" : "Settings"}
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">
          {isAr ? "إدارة إعدادات حسابك" : "Manage your account settings"}
        </p>
      </div>

      <div className="divide-y divide-gray-100 border-t border-gray-100">
        {/* Change email */}
        {canChangeEmail ? (
          <div className="py-4 sm:py-5 space-y-4">
            <EmailChangePendingBanner
              locale={locale}
              nextPath={nextPath}
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
                <p className="text-sm text-gray-500 truncate" dir="ltr">
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
        <div className="py-4 sm:py-5">
          <div className="flex items-start sm:items-center gap-3">
            <Lock
              className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 sm:mt-0"
              strokeWidth={1.5}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-black">
                {hasPassword
                  ? isAr
                    ? "تغيير كلمة المرور"
                    : "Change Password"
                  : isAr
                    ? "تعيين كلمة المرور"
                    : "Set Password"}
              </h3>
              <p className="text-sm text-gray-500">
                {hasPassword
                  ? isAr
                    ? "تحديث كلمة المرور لحسابك"
                    : "Update your account password"
                  : isAr
                    ? "تعيين كلمة مرور لتسجيل الدخول بالبريد الإلكتروني"
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
                  {isAr ? "كلمة المرور الحالية" : "Current password"}
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    dir="ltr"
                    className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition ${
                      isAr ? "pl-10 pr-4 text-right" : "pr-10 pl-4 text-left"
                    }`}
                    placeholder={
                      isAr
                        ? "أدخل كلمة المرور الحالية"
                        : "Enter current password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition ${
                      isAr ? "left-3" : "right-3"
                    }`}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="settings-new-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  {isAr ? "كلمة المرور الجديدة" : "New password"}
                </label>
                <div className="relative">
                  <input
                    id="settings-new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition ${
                      isAr ? "pl-10 pr-4 text-right" : "pr-10 pl-4 text-left"
                    }`}
                    placeholder={
                      isAr ? "أدخل كلمة المرور الجديدة" : "Enter new password"
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
                </label>
                <div className="relative">
                  <input
                    id="settings-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition ${
                      isAr ? "pl-10 pr-4 text-right" : "pr-10 pl-4 text-left"
                    }`}
                    placeholder={
                      isAr
                        ? "تأكيد كلمة المرور الجديدة"
                        : "Confirm new password"
                    }
                  />
                  {confirmPassword && password === confirmPassword && (
                    <Check
                      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 ${
                        isAr ? "left-3" : "right-3"
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>

            {password ? (
              <PasswordChecklist
                password={password}
                labels={checklistLabels}
              />
            ) : null}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 hover:cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 accent-black hover:cursor-pointer shrink-0"
                />
                {isAr ? "إظهار كلمات المرور" : "Show passwords"}
              </label>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid(password)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800 transition hover:cursor-pointer min-w-36 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isAr ? "جارٍ الحفظ..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isAr ? "حفظ كلمة المرور" : "Save password"}
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
