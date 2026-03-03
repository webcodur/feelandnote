"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteAccount, changePassword } from "@/actions/auth";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";

interface ProfileSettingsSectionProps {
  isEmailUser?: boolean;
}

export default function ProfileSettingsSection({ isEmailUser }: ProfileSettingsSectionProps) {
  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      {isEmailUser && <PasswordChangeCard />}
      <DangerZoneCard />
    </section>
  );
}

// #region 비밀번호 변경 카드
function PasswordChangeCard() {
  const t = useTranslations("profilePage.settings");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSave = async () => {
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setIsSaving(true);
    const result = await changePassword({ currentPassword, newPassword });

    if (result.error) {
      setError(result.error);
    } else {
      setSaveSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  return (
    <ClassicalBox className="p-6 md:p-8">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label={t("passwordChange")} />
      </div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          {saveSuccess && <Check size={16} className="text-green-400" />}
          <button onClick={handleSave} disabled={isSaving || !canSubmit} className="px-4 py-2 text-sm bg-accent text-bg-main font-bold rounded-sm hover:bg-accent-hover disabled:opacity-50">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : t("change")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label className="text-xs text-text-secondary mb-1 block">{t("currentPassword")}</label>
          <div className="relative">
            <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t("currentPasswordPlaceholder")} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 pe-10 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">{t("newPassword")}</label>
          <div className="relative">
            <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("newPasswordPlaceholder")} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 pe-10 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-text-secondary mb-1 block">{t("confirmPassword")}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("confirmPasswordPlaceholder")} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">{t("passwordNotMatch")}</p>
          )}
        </div>
      </div>
    </ClassicalBox>
  );
}
// #endregion

// #region 위험 영역 카드
function DangerZoneCard() {
  const t = useTranslations("profilePage.settings");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmText = t("confirmWord");
  const canDelete = confirmInput === confirmText;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await deleteAccount();
  };

  return (
    <ClassicalBox variant="danger" className="p-6 md:p-8">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label={t("dangerZone")} className="[&_span]:text-red-400 [&_div]:to-red-400" />
      </div>

      {!showConfirm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">{t("deleteAccount")}</p>
            <p className="text-xs text-text-secondary mt-1">{t("deleteAccountDesc")}</p>
          </div>
          <button onClick={() => setShowConfirm(true)} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-sm hover:bg-red-500/10">{t("deleteButton")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-sm border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-400">{t("deleteConfirmTitle")}</p>
              <p className="text-text-secondary mt-1">{t("deleteConfirmDesc")}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-2">{t("confirmInputGuide", { word: confirmText })}</p>
            <input type="text" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder={confirmText} className="w-full h-10 bg-black/30 border border-red-500/30 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-red-500/50 placeholder:text-text-secondary/50" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowConfirm(false); setConfirmInput(""); }} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm text-text-secondary border border-border rounded-sm hover:bg-white/5">{t("cancel")}</button>
            <button onClick={handleDelete} disabled={!canDelete || isDeleting} className="flex-1 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-sm hover:bg-red-500/30 disabled:opacity-50">
              {isDeleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : t("permanentDelete")}
            </button>
          </div>
        </div>
      )}
    </ClassicalBox>
  );
}
// #endregion
