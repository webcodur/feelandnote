"use client";

import { useState } from "react";
import { Pencil, Check, X, MapPin, Calendar, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { type PublicUserProfile, updateProfile } from "@/actions/user";
import NationalityText from "@/components/ui/NationalityText";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { useCountries } from "@/hooks/useCountries";
import SearchableSelect from "@/components/ui/SearchableSelect";
import AvatarUploader from "./AvatarUploader";

interface UserBioSectionProps {
  profile: PublicUserProfile;
  isOwner: boolean;
}

export default function UserBioSection({ profile, isOwner }: UserBioSectionProps) {
  const t = useTranslations("userBio");
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [bioValue, setBioValue] = useState(profile.bio || "");
  const [nationality, setNationality] = useState(profile.nationality || "");
  const [birthDate, setBirthDate] = useState(profile.birth_date || "");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // 표시는 저장된 로컬 상태를 기준으로 한다. profile은 서버가 처음 준 값이라
  // 저장 후에도 옛 값을 그대로 들고 있어, 지운 항목이 되살아나 보인다.
  const hasInfo = nationality || birthDate;

  if (!hasInfo && !bioValue && !isOwner) return null;

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const result = await updateProfile({
      nickname,
      avatar_url: avatarUrl || undefined,
      bio: bioValue,
      nationality: nationality || null,
      birth_date: birthDate || null,
    });
    if (result.success) {
      setIsEditing(false);
      // 헤더·다른 화면이 쓰는 서버 데이터도 맞춰둔다
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setNickname(profile.nickname);
    // 사진은 선택 즉시 저장되므로 취소로 되돌리지 않는다
    setBioValue(profile.bio || "");
    setNationality(profile.nationality || "");
    setBirthDate(profile.birth_date || "");
    setUploadError("");
    setIsEditing(false);
  };

  // 사진·닉네임 모두 저장된 로컬 상태를 쓴다(위 hasInfo 주석 참조)
  const displayNickname = nickname;

  return (
    <ClassicalBox as="section" className="p-0 md:p-6 bg-bg-card/40 border-accent/20 shadow-xl">
      <div className="flex justify-center mb-4 relative">
        <DecorativeLabel label={t("label")} />
      </div>

      {/* 아바타 + 닉네임 + 액션 버튼 */}
      <div className="flex items-center gap-3 mb-3">
        <AvatarUploader
          avatarUrl={avatarUrl}
          nickname={displayNickname}
          isEditing={isEditing && isOwner}
          onUploaded={setAvatarUrl}
          onError={setUploadError}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="w-full h-8 bg-black/30 border border-accent/20 rounded-sm px-2 text-sm font-semibold text-text-primary outline-none focus:border-accent/50" />
          ) : (
            <span className="text-sm font-semibold text-text-primary block truncate">{displayNickname}</span>
          )}
          {/* 국적/생일 (읽기 모드) */}
          {!isEditing && hasInfo && (
            <div className="flex flex-wrap gap-3 mt-1">
              {nationality && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <MapPin size={12} className="text-accent/60" />
                  <NationalityText code={nationality} />
                </div>
              )}
              {birthDate && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Calendar size={12} className="text-accent/60" />
                  <span>{birthDate}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {isOwner && (
          <div className="shrink-0 flex items-center gap-1">
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-sm" title={t("cancel")}>
                  <X size={14} />
                </button>
                <button onClick={handleSave} disabled={isSaving} className="p-1.5 text-accent hover:bg-accent/10 rounded-sm disabled:opacity-50" title="저장">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-sm" title={t("editProfile")}>
                <Pencil size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 사진 업로드 오류 */}
      {isEditing && uploadError && (
        <p className="text-sm text-status-paused mb-3">{uploadError}</p>
      )}

      {/* 국적/생일 (편집 모드) */}
      {isEditing && <MetaEditFields nationality={nationality} setNationality={setNationality} birthDate={birthDate} setBirthDate={setBirthDate} />}

      {/* bio */}
      {isEditing ? (
        <div className="mb-3">
          <textarea value={bioValue} onChange={(e) => setBioValue(e.target.value)} placeholder={t("bioPlaceholder")} className="w-full bg-black/30 border border-accent/20 rounded-sm p-3 text-sm text-text-primary resize-none focus:outline-none focus:border-accent/50 placeholder:text-text-secondary/50" rows={3} maxLength={200} />
          <span className="text-xs text-text-secondary">{bioValue.length} / 200</span>
        </div>
      ) : bioValue ? (
        <p className="text-sm text-text-primary leading-relaxed mb-3">{bioValue}</p>
      ) : isOwner ? (
        <p className="text-sm text-text-secondary/50 mb-3">{t("bioEmpty")}</p>
      ) : null}

      {/* 사진 변경 안내 (편집 모드에서만) */}
      {isEditing && (
        <p className="text-sm text-text-secondary">{t("avatarHint")}</p>
      )}
    </ClassicalBox>
  );
}

// #region 국적/생일 편집 필드
interface MetaEditFieldsProps {
  nationality: string;
  setNationality: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
}

function MetaEditFields({ nationality, setNationality, birthDate, setBirthDate }: MetaEditFieldsProps) {
  const t = useTranslations("userBio");
  const { countries, loading } = useCountries();

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div>
        <label className="text-xs text-text-secondary mb-1 block">{t("nationalityLabel")}</label>
        <SearchableSelect
          options={countries.map((c) => ({ value: c.code, label: c.name }))}
          value={nationality}
          onChange={setNationality}
          placeholder={loading ? t("loading") : t("select")}
          disabled={loading}
        />
      </div>
      <div>
        <label className="text-xs text-text-secondary mb-1 block">{t("birthdateLabel")}</label>
        <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full h-9 bg-black/30 border border-accent/20 rounded-sm px-2 text-sm text-text-primary outline-none focus:border-accent/50" />
      </div>
    </div>
  );
}
// #endregion
