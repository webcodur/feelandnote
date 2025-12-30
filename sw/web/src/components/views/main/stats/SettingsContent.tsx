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
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <User size={18} className="text-accent" />
          <h3 className="font-semibold">프로필 설정</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* 아바타 미리보기 */}
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="프로필"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-accent/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xl font-bold text-white ring-2 ring-accent/20">
                  {nickname.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">프로필 이미지 URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full h-9 bg-black/20 border border-border rounded-lg px-3 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
              />
            </div>
          </div>

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              className="w-full h-10 bg-black/20 border border-border rounded-lg px-3 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
            />
            <p className="text-xs text-text-tertiary">{nickname.length}/20</p>
          </div>

          {/* 소개글 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">소개글</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자기소개를 작성해보세요"
              maxLength={200}
              rows={3}
              className="w-full bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-text-secondary resize-none"
            />
            <p className="text-xs text-text-tertiary">{bio.length}/200</p>
          </div>

          {/* 저장 버튼 */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleProfileSave}
              disabled={isSavingProfile || !hasProfileChanges}
            >
              {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : "저장"}
            </Button>
            {profileSaveSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <Check size={14} />
                저장되었다
              </span>
            )}
            {profileError && (
              <span className="text-sm text-red-400">{profileError}</span>
            )}
          </div>
        </div>
      </Card>

      {/* AI 설정 카드 */}
      <Card className="p-0">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h3 className="font-semibold">AI 설정</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* 안내 텍스트 */}
          <p className="text-sm text-text-secondary">
            Gemini API 키를 등록하면 리뷰 예시 생성, 줄거리 요약 등 AI 기능을 사용할 수 있다.
          </p>

          {/* API 키 입력 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Gemini API 키</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="API 키를 입력하세요"
                  className="w-full h-10 bg-black/20 border border-border rounded-lg px-3 pr-10 text-sm outline-none focus:border-accent placeholder:text-text-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : "저장"}
              </Button>
            </div>

            {/* 저장 성공 메시지 */}
            {saveSuccess && (
              <p className="text-sm text-green-400">저장되었습니다.</p>
            )}
          </div>

          {/* API 키 발급 링크 */}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink size={14} />
            Google AI Studio에서 API 키 발급받기
          </a>

          {/* 안내사항 */}
          <div className="p-3 bg-white/5 rounded-lg text-xs text-text-secondary space-y-1">
            <p>• API 키는 암호화되어 안전하게 저장된다.</p>
            <p>• 무료 할당량 내에서 사용 가능하다.</p>
            <p>• 키를 삭제하려면 입력란을 비우고 저장하면 된다.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
