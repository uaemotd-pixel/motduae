"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";
import { Eye, EyeOff, Check, Mail, Edit, UserRound, Lock } from "lucide-react";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import { canChangeAccountEmail } from "@/lib/auth/emailVerification";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getTranslation } from "@/lib/getTranslation";

type ApiUserResponse = {
  _id: string;
  name: string;
  nameAr?: string;
  email: string;
  phone?: string;
  role: string;
  isAdmin?: boolean;
  approvalStatus?: string;
  isActive?: boolean;
  authProvider?: string;
  hasPassword?: boolean;
  emailVerified?: boolean;
  perms?: Record<string, boolean>;
  isGuest?: boolean;
  guestContactEmail?: string | null;
  guestPendingEmail?: string | null;
  applicationSubmittedAt?: string | null;
  requestNumber?: string | null;
  rejectionNote?: string;
};

export default function TailorSettingsForm() {
  const { user, applyUserResponse } = useAuth();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isAr = locale === "ar";
  const tVerify = getTranslation(locale).verifyEmail;
  const hasPassword = user?.hasPassword === true;
  const canChangeEmail = canChangeAccountEmail(user);

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setNameAr(user?.nameAr || "");
  }, [user?.name, user?.nameAr]);

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

    const trimmedName = name.trim();
    const trimmedNameAr = nameAr.trim();

    if (!trimmedName) {
      toast.error(isAr ? "الاسم بالإنجليزية مطلوب." : "English name is required.");
      return;
    }
    if (!trimmedNameAr) {
      toast.error(isAr ? "الاسم بالعربية مطلوب." : "Arabic name is required.");
      return;
    }

    const wantsPasswordChange = Boolean(
      password || confirmPassword || currentPassword,
    );

    if (wantsPasswordChange) {
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
          isAr
            ? "كلمة المرور الحالية مطلوبة."
            : "Current password is required.",
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const profileResponse = await api.put<ApiUserResponse>(
        "/api/users/profile",
        {
          name: trimmedName,
          nameAr: trimmedNameAr,
        },
      );
      applyUserResponse(profileResponse);

      if (wantsPasswordChange) {
        const passwordResponse = await api.put<ApiUserResponse>(
          "/api/users/change-password",
          {
            currentPassword: hasPassword ? currentPassword : undefined,
            password,
          },
        );
        applyUserResponse(passwordResponse);
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
      }

      toast.success(
        isAr ? "تم حفظ الإعدادات بنجاح." : "Settings saved successfully.",
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : isAr
            ? "فشل حفظ الإعدادات."
            : "Failed to save settings.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showChangeEmail && canChangeEmail) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
        <PartnerChangeEmailCard
          locale={locale}
          nextPath="/tailor/settings"
          currentEmail={user?.email}
          onCancel={() => setShowChangeEmail(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="font-display text-xl sm:text-2xl font-light text-black tracking-tight">
          {isAr ? "الإعدادات" : "Settings"}
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">
          {isAr ? "إدارة إعدادات حسابك" : "Manage your account settings"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal name */}
        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <UserRound
              className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div>
              <h3 className="text-sm font-medium text-black">
                {isAr ? "الاسم الشخصي" : "Personal name"}
              </h3>
              <p className="text-sm text-gray-500">
                {isAr
                  ? "الاسم الذي يظهر على حسابك"
                  : "The name shown on your account"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:ps-8">
            <div>
              <label
                htmlFor="tailor-name-en"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                {isAr ? "الاسم (إنجليزي)" : "Name (English)"}
              </label>
              <input
                id="tailor-name-en"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                dir="ltr"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                placeholder="e.g. Ayesha Al Riaz"
                autoComplete="name"
              />
            </div>
            <div>
              <label
                htmlFor="tailor-name-ar"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                {isAr ? "الاسم (عربي)" : "Name (Arabic)"}
              </label>
              <input
                id="tailor-name-ar"
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                placeholder="مثال: عائشة الرِياض"
                autoComplete="name"
              />
            </div>
          </div>
        </section>

        {/* Email */}
        {canChangeEmail ? (
          <section className="space-y-4 border-t border-gray-100 pt-6">
            <EmailChangePendingBanner
              locale={locale}
              nextPath="/tailor/settings"
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
          </section>
        ) : null}

        {/* Password */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <div className="flex items-start gap-3">
            <Lock
              className="w-5 h-5 text-gray-400 shrink-0 mt-0.5"
              strokeWidth={1.5}
            />
            <div>
              <h3 className="text-sm font-medium text-black">
                {hasPassword
                  ? isAr
                    ? "تغيير كلمة المرور"
                    : "Change password"
                  : isAr
                    ? "تعيين كلمة المرور"
                    : "Set password"}
              </h3>
              <p className="text-sm text-gray-500">
                {isAr
                  ? "اتركه فارغاً إذا لم ترد تغيير كلمة المرور"
                  : "Leave blank if you do not want to change your password"}
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:ps-8">
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
                    className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition ${
                      isAr ? "pl-10 pr-4 text-right" : "pr-10 pl-4 text-left"
                    }`}
                    placeholder={
                      isAr
                        ? "أدخل كلمة المرور الحالية"
                        : "Enter current password"
                    }
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer ${
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="settings-new-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  {isAr ? "كلمة المرور الجديدة" : "New password"}
                </label>
                <input
                  id="settings-new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition"
                  placeholder={
                    isAr ? "أدخل كلمة المرور الجديدة" : "Enter new password"
                  }
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  {isAr ? "تأكيد كلمة المرور" : "Confirm password"}
                </label>
                <div className="relative">
                  <input
                    id="settings-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    dir="ltr"
                    className={`w-full rounded-lg border border-gray-200 py-2.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition ${
                      isAr ? "pl-10 pr-4" : "pr-10 pl-4"
                    }`}
                    placeholder={
                      isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"
                    }
                    autoComplete="new-password"
                  />
                  {confirmPassword && password === confirmPassword ? (
                    <Check
                      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 ${
                        isAr ? "left-3" : "right-3"
                      }`}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {password ? (
              <PasswordChecklist password={password} labels={checklistLabels} />
            ) : null}

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer shrink-0"
              />
              {isAr ? "إظهار كلمات المرور" : "Show passwords"}
            </label>
          </div>
        </section>

        <div className="flex justify-end border-t border-gray-100 pt-6">
          <button
            type="submit"
            disabled={
              isLoading ||
              (Boolean(password || confirmPassword || currentPassword) &&
                !isPasswordValid(password))
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isAr ? "جارٍ الحفظ..." : "SAVING..."}
              </>
            ) : isAr ? (
              "حفظ الإعدادات"
            ) : (
              "SAVE SETTINGS"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
