"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink, Loader2, Sparkles, User, Check } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";

interface ProfileData {
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
}

interface SettingsContentProps {
  apiKey: string | null;
  onSave: (key: string) => Promise<void>;
  isSaving: boolean;
  profile: ProfileData | null;
  onProfileUpdate: (data: Partial<ProfileData>) => Promise<{ success: boolean; error?: string }>;
}

export default function SettingsContent({ apiKey, onSave, isSaving, profile, onProfileUpdate }: SettingsContentProps) {
  const [inputValue, setInputValue] = useState(apiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 프로필 편집 상태
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await onSave(inputValue);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // 에러는 상위에서 처리
    }
  };

  const hasChanges = inputValue !== (apiKey || "");

  const hasProfileChanges =
    nickname !== (profile?.nickname || "") ||
    bio !== (profile?.bio || "") ||
    avatarUrl !== (profile?.avatar_url || "");

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const result = await onProfileUpdate({
        nickname,
        bio,
        avatar_url: avatarUrl || null,
      });
      if (result.success) {
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 2000);
      } else {
        setProfileError(result.error || "저장에 실패했다.");
      }
    } catch {
      setProfileError("저장에 실패했다.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 프로필 편집 카드 */}
      <Card className="p-0">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-accent" />
            <h3 className="font-semibold text-sm">프로필</h3>
          </div>
          <div className="flex items-center gap-2">
            {profileSaveSuccess && <Check size={14} className="text-green-400" />}
            {profileError && <span className="text-xs text-red-400">{profileError}</span>}
            <Button
              variant="primary"
              size="sm"
              onClick={handleProfileSave}
              disabled={isSavingProfile || !hasProfileChanges}
            >
              {isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : "저장"}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* 아바타 + 닉네임 */}
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="프로필" className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/20 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-lg font-bold text-white ring-2 ring-accent/20 shrink-0">
                {nickname.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임"
                maxLength={20}
                className="w-full h-9 bg-black/20 border border-border rounded-lg px-3 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
              />
            </div>
          </div>

          {/* 이미지 URL */}
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="프로필 이미지 URL"
            className="w-full h-9 bg-black/20 border border-border rounded-lg px-3 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
          />

          {/* 소개글 */}
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="소개글"
              maxLength={200}
              rows={2}
              className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-text-secondary resize-none"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-text-tertiary">{bio.length}/200</span>
          </div>
        </div>
      </Card>

      {/* AI 설정 카드 */}
      <Card className="p-0">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h3 className="font-semibold text-sm">AI 설정</h3>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && <Check size={14} className="text-green-400" />}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* API 키 입력 */}
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Gemini API 키"
              className="w-full h-9 bg-black/20 border border-border rounded-lg px-3 pr-10 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
            />
            <Button
              unstyled
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
          </div>

          {/* API 키 발급 링크 + 안내 */}
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <ExternalLink size={12} />
              API 키 발급
            </a>
            <span>AI 리뷰 생성, 줄거리 요약에 사용</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
