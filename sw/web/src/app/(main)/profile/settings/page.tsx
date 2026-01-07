/*
  파일명: /app/(main)/profile/settings/page.tsx
  기능: 설정 페이지
  책임: 프로필 및 계정 설정을 관리한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getProfile, updateApiKey, updateProfile, type UserProfile } from "@/actions/user";
import SettingsContent from "@/components/features/profile/SettingsContent";

export default function Page() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const profileData = await getProfile();
        setProfile(profileData);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveApiKey = async (key: string) => {
    setIsSavingApiKey(true);
    try {
      await updateApiKey({ geminiApiKey: key });
      setProfile((prev) => (prev ? { ...prev, gemini_api_key: key || null } : null));
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleProfileUpdate = async (data: { nickname?: string; bio?: string | null; avatar_url?: string | null }) => {
    const result = await updateProfile({
      nickname: data.nickname,
      bio: data.bio ?? undefined,
      avatar_url: data.avatar_url ?? undefined,
    });
    if (result.success) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              nickname: data.nickname ?? prev.nickname,
              bio: data.bio ?? prev.bio,
              avatar_url: data.avatar_url !== undefined ? data.avatar_url : prev.avatar_url,
            }
          : null
      );
    }
    return result;
  };

  return (
    <>
      <SectionHeader
        title="설정"
        description="프로필 및 계정 설정을 관리하세요"
        icon={<Settings size={20} />}
        className="mb-4"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      ) : (
        <SettingsContent
          apiKey={profile?.gemini_api_key || null}
          onSave={handleSaveApiKey}
          isSaving={isSavingApiKey}
          profile={profile ? { nickname: profile.nickname, avatar_url: profile.avatar_url, bio: profile.bio || null } : null}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
}
