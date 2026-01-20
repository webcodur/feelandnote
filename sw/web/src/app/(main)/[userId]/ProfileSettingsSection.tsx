"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Eye, EyeOff, ExternalLink, Loader2, Sparkles, User, Trash2, AlertTriangle } from "lucide-react";
import { type PublicUserProfile, updateProfile, updateApiKey } from "@/actions/user";
import { deleteAccount } from "@/actions/auth";
import { useCountries } from "@/hooks/useCountries";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel, InnerBox } from "@/components/ui";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface ProfileSettingsSectionProps {
  profile: PublicUserProfile;
  initialApiKey?: string | null;
}

export default function ProfileSettingsSection({ profile, initialApiKey }: ProfileSettingsSectionProps) {
  return (
    <section className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <ClassicalBox className="p-4 sm:p-6 md:p-8 bg-bg-card/40 shadow-2xl border-accent-dim/20">
        <div className="flex justify-center mb-6 sm:mb-8">
          <DecorativeLabel label="설정" />
        </div>
        <div className="space-y-6">
        <ProfileEditCard profile={profile} />
        <ApiKeyCard initialApiKey={initialApiKey} />
        <DangerZoneCard />
        </div>
      </ClassicalBox>
    </section>
  );
}

// #region 프로필 편집 카드
function ProfileEditCard({ profile }: { profile: PublicUserProfile }) {
  const { countries, loading: countriesLoading } = useCountries();
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [birthDate, setBirthDate] = useState(profile.birth_date || "");
  const [nationality, setNationality] = useState(profile.nationality || "");
  const [quotes, setQuotes] = useState(profile.quotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges =
    nickname !== profile.nickname ||
    avatarUrl !== (profile.avatar_url || "") ||
    birthDate !== (profile.birth_date || "") ||
    nationality !== (profile.nationality || "") ||
    quotes !== (profile.quotes || "");

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile({
      nickname,
      avatar_url: avatarUrl || undefined,
      birth_date: birthDate || null,
      nationality: nationality || null,
      quotes: quotes || null,
    });
    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  return (
    <InnerBox className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User size={20} className="text-accent" />
          <h3 className="text-lg font-serif font-bold text-text-primary">프로필</h3>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <Check size={16} className="text-green-400" />}
          <button onClick={handleSave} disabled={isSaving || !hasChanges} className="px-4 py-2 text-sm bg-accent text-bg-main font-bold rounded-sm hover:bg-accent-hover disabled:opacity-50">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <div className="relative w-16 h-16 shrink-0">
              <Image src={avatarUrl} alt="프로필" fill unoptimized className="rounded-full object-cover ring-2 ring-accent/30" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent ring-2 ring-accent/30 shrink-0">
              {nickname.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <label className="text-xs text-text-secondary mb-1 block">닉네임</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50" />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1 block">프로필 이미지 URL</label>
          <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
        </div>

        <div className="pt-4 border-t border-border/30">
          <p className="text-xs text-text-secondary mb-3">추가 정보 (선택)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">생년월일</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">국적/지역</label>
              <SearchableSelect
                options={countries.map((c) => ({ value: c.code, label: c.name }))}
                value={nationality}
                onChange={setNationality}
                placeholder={countriesLoading ? "로딩 중..." : "선택"}
                disabled={countriesLoading}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-text-secondary mb-1 block">좌우명</label>
            <input type="text" value={quotes} onChange={(e) => setQuotes(e.target.value)} placeholder="나를 표현하는 한 줄" maxLength={100} className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
          </div>
        </div>
      </div>
    </InnerBox>
  );
}
// #endregion

// #region API 키 카드
function ApiKeyCard({ initialApiKey }: { initialApiKey?: string | null }) {
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges = apiKey !== (initialApiKey || "");

  const handleSave = async () => {
    setIsSaving(true);
    await updateApiKey({ geminiApiKey: apiKey });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setIsSaving(false);
  };

  return (
    <InnerBox className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-accent" />
          <h3 className="text-lg font-serif font-bold text-text-primary">AI 설정</h3>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <Check size={16} className="text-green-400" />}
          <button onClick={handleSave} disabled={isSaving || !hasChanges} className="px-4 py-2 text-sm bg-accent text-bg-main font-bold rounded-sm hover:bg-accent-hover disabled:opacity-50">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <label className="text-xs text-text-secondary mb-1 block">Gemini API 키</label>
          <div className="relative">
            <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API 키 입력" className="w-full h-10 bg-black/30 border border-accent/20 rounded-sm px-3 pe-10 text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-secondary/50" />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
            <ExternalLink size={12} />API 키 발급
          </a>
          <span>AI 리뷰 생성, 줄거리 요약에 사용</span>
        </div>
      </div>
    </InnerBox>
  );
}
// #endregion

// #region 위험 영역 카드
function DangerZoneCard() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmText = "탈퇴합니다";
  const canDelete = confirmInput === confirmText;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await deleteAccount();
  };

  return (
    <InnerBox className="p-6 md:p-8 border-red-500/30">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 size={20} className="text-red-400" />
        <h3 className="text-lg font-serif font-bold text-red-400">위험 영역</h3>
      </div>

      {!showConfirm ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">회원탈퇴</p>
            <p className="text-xs text-text-secondary mt-1">모든 기록, 플레이리스트, 팔로우 정보가 영구 삭제된다.</p>
          </div>
          <button onClick={() => setShowConfirm(true)} className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-sm hover:bg-red-500/10">탈퇴하기</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 rounded-sm border border-red-500/20">
            <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-400">정말 탈퇴하시겠습니까?</p>
              <p className="text-text-secondary mt-1">이 작업은 되돌릴 수 없다. 모든 데이터가 즉시 삭제된다.</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-2">확인을 위해 <span className="text-red-400 font-medium">{confirmText}</span>를 입력</p>
            <input type="text" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder={confirmText} className="w-full h-10 bg-black/30 border border-red-500/30 rounded-sm px-3 text-sm text-text-primary outline-none focus:border-red-500/50 placeholder:text-text-secondary/50" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowConfirm(false); setConfirmInput(""); }} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm text-text-secondary border border-border rounded-sm hover:bg-white/5">취소</button>
            <button onClick={handleDelete} disabled={!canDelete || isDeleting} className="flex-1 px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-sm hover:bg-red-500/30 disabled:opacity-50">
              {isDeleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "영구 삭제"}
            </button>
          </div>
        </div>
      )}
    </InnerBox>
  );
}
// #endregion
